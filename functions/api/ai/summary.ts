/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Chapter Summary API - Backend-only
 * POST /api/ai/summary - Extract chapter summaries from book content
 */

import { createDatabaseRouter } from '../../db-router';

interface Env {
  DB_1?: D1Database;
  DB_2?: D1Database;
  DB_3?: D1Database;
  DB_4?: D1Database;
  DB_5?: D1Database;
  DB_6?: D1Database;
  DB_7?: D1Database;
  DB_8?: D1Database;
  DB_9?: D1Database;
  DB_10?: D1Database;
  KV_CACHE?: KVNamespace;
}

interface ChapterSummary {
  title: string;
  summary: string;
  position: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { bookId: string; content?: string };
    const { bookId, content } = body;

    if (!bookId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const cacheKey = `summary:${bookId}`;
    const cached = await env.KV_CACHE.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({
        success: true,
        chapters: JSON.parse(cached),
        fromCache: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if we have indexed content in the database
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);
    const indexedContent = await db.prepare(
      'SELECT chapter, content_text, snippet, position FROM book_content_index WHERE book_id = ? ORDER BY position'
    ).bind(bookId).all();

    if (indexedContent && Array.isArray(indexedContent) && indexedContent.length > 0) {
      const rows = indexedContent as unknown as Array<{
        chapter: string;
        snippet: string;
        position: number;
      }>;
      const chapters: ChapterSummary[] = rows.map(row => ({
        title: row.chapter || 'Chapter',
        summary: row.snippet || extractFirstSentences(row.chapter, 2),
        position: row.position
      }));

      // Cache for 1 hour
      await env.KV_CACHE.put(cacheKey, JSON.stringify(chapters), { expirationTtl: 3600 });

      return new Response(JSON.stringify({
        success: true,
        chapters
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If content is provided, parse it to extract chapters
    if (content) {
      const chapters = extractChaptersFromContent(content);

      if (chapters.length > 0) {
        // Cache for 1 hour
        await env.KV_CACHE.put(cacheKey, JSON.stringify(chapters), { expirationTtl: 3600 });
      }

      return new Response(JSON.stringify({
        success: true,
        chapters
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      chapters: [],
      message: 'No content available for summarization'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Summary error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate summaries'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function extractFirstSentences(text: string, count: number): string {
  if (!text) return '';
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  
  // Split by sentence endings
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  return sentences.slice(0, count).join('. ').trim() + '.';
}

function extractChaptersFromContent(content: string): ChapterSummary[] {
  const chapters: ChapterSummary[] = [];
  
  // Common chapter heading patterns
  const patterns = [
    /<h[12][^>]*>(.*?)<\/h[12]>/gi,
    /Chapter\s+(\d+|[IVXLCDM]+)[:\.\s]*(.*?)(?=\n|<)/gi,
    /CHAPTER\s+(\d+|[IVXLCDM]+)[:\.\s]*(.*?)(?=\n|<)/gi,
    /Part\s+(\d+|[IVXLCDM]+)[:\.\s]*(.*?)(?=\n|<)/gi
  ];

  let position = 0;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      
      // Get the text following this heading (up to next heading or 500 chars)
      const startIndex = match.index + match[0].length;
      const nextContent = content.substring(startIndex, startIndex + 1000);
      const summary = extractFirstSentences(nextContent, 2);

      if (title && !chapters.some(c => c.title === title)) {
        chapters.push({
          title,
          summary: summary || 'Chapter content...',
          position: position++
        });
      }
    }
  }

  return chapters;
}
