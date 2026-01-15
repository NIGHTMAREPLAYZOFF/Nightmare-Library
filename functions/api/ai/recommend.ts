/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * AI Recommendations API - Backend-only
 * POST /api/ai/recommend - Get book recommendations based on reading history
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

interface Book {
  id: string;
  title: string;
  author: string | null;
  tags: string | null;
  progress?: number;
  last_read_at?: number;
}

interface Recommendation {
  book: Book;
  score: number;
  reason: string;
}

const genreKeywords: Record<string, string[]> = {
  'fantasy': ['magic', 'dragon', 'wizard', 'quest', 'realm', 'sorcerer', 'elf', 'dwarf'],
  'scifi': ['space', 'alien', 'future', 'robot', 'galaxy', 'cyberpunk', 'dystopia', 'android'],
  'mystery': ['detective', 'murder', 'crime', 'investigation', 'thriller', 'suspect', 'clue'],
  'romance': ['love', 'heart', 'passion', 'relationship', 'kiss', 'wedding'],
  'horror': ['horror', 'terror', 'haunted', 'ghost', 'nightmare', 'dark', 'demon'],
  'biography': ['life', 'autobiography', 'memoir', 'story of', 'journey'],
  'history': ['history', 'historical', 'war', 'ancient', 'century', 'empire'],
  'business': ['business', 'entrepreneur', 'startup', 'marketing', 'leadership', 'strategy'],
  'selfhelp': ['self-help', 'motivation', 'success', 'habit', 'mindset', 'productivity'],
  'science': ['science', 'physics', 'biology', 'chemistry', 'research', 'discovery']
};

function detectGenres(book: Book): string[] {
  const text = `${book.title} ${book.author || ''} ${book.tags || ''}`.toLowerCase();
  const detected: string[] = [];

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        detected.push(genre);
        break;
      }
    }
  }

  return detected.length > 0 ? detected : ['general'];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { bookId?: string; limit?: number };
    const { bookId, limit = 5 } = body;

    if (!bookId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current book
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);
    const currentBook = await db.prepare(
      'SELECT id, title, author, tags, last_read_at FROM books WHERE id = ?'
    ).bind(bookId).first() as Book | null;

    if (!currentBook) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all other books from all databases
    const allBooks = await router.queryAll(
      'SELECT id, title, author, tags, last_read_at FROM books ORDER BY last_read_at DESC LIMIT 100'
    );

    if (!allBooks || allBooks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        recommendations: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Detect genres for current book
    const currentGenres = detectGenres(currentBook);
    const recommendations: Recommendation[] = [];

    for (const book of (allBooks as unknown as Book[]).filter(b => b.id !== bookId)) {
      const bookGenres = detectGenres(book);
      const commonGenres = currentGenres.filter(g => bookGenres.includes(g));

      if (commonGenres.length > 0) {
        // Calculate score based on genre overlap and author match
        let score = commonGenres.length * 10;
        
        // Bonus for same author
        if (book.author && currentBook.author && 
            book.author.toLowerCase() === currentBook.author.toLowerCase()) {
          score += 20;
        }

        recommendations.push({
          book,
          score,
          reason: commonGenres.length > 0 
            ? `Similar: ${commonGenres.join(', ')}`
            : 'Same author'
        });
      }
    }

    // Sort by score and limit results
    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return new Response(JSON.stringify({
      success: true,
      recommendations: topRecommendations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate recommendations'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
