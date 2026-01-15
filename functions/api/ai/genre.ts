/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Genre Suggestion API - Backend-only, User-Initiated
 * POST /api/ai/genre - Suggest genres for a book (user must confirm)
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
}

interface GenreSuggestion {
  genre: string;
  confidence: number;
  matchedKeywords: string[];
}

const genreKeywords: Record<string, string[]> = {
  'fantasy': ['magic', 'dragon', 'wizard', 'fantasy', 'quest', 'realm', 'sorcerer', 'elf', 'dwarf', 'enchant', 'spell', 'witch', 'fairy'],
  'scifi': ['space', 'alien', 'future', 'robot', 'galaxy', 'cyberpunk', 'dystopia', 'android', 'starship', 'planet', 'mars', 'time travel'],
  'mystery': ['detective', 'murder', 'crime', 'investigation', 'thriller', 'suspect', 'clue', 'mystery', 'solve', 'case'],
  'romance': ['love', 'heart', 'passion', 'romance', 'relationship', 'kiss', 'wedding', 'couple', 'romantic'],
  'horror': ['horror', 'terror', 'haunted', 'ghost', 'nightmare', 'dark', 'demon', 'vampire', 'zombie', 'curse'],
  'biography': ['life', 'autobiography', 'memoir', 'biography', 'story of', 'journey', 'years'],
  'history': ['history', 'historical', 'war', 'ancient', 'century', 'empire', 'civilization', 'revolution'],
  'business': ['business', 'entrepreneur', 'startup', 'marketing', 'leadership', 'strategy', 'management', 'finance'],
  'selfhelp': ['self-help', 'motivation', 'success', 'habit', 'mindset', 'productivity', 'happiness', 'growth'],
  'science': ['science', 'physics', 'biology', 'chemistry', 'research', 'discovery', 'theory', 'experiment'],
  'philosophy': ['philosophy', 'ethics', 'moral', 'meaning', 'existence', 'thought', 'wisdom'],
  'poetry': ['poem', 'poetry', 'verse', 'sonnet', 'rhyme', 'lyric'],
  'cooking': ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'cuisine', 'ingredient'],
  'travel': ['travel', 'journey', 'adventure', 'explore', 'destination', 'wanderlust'],
  'children': ['children', 'kids', 'bedtime', 'picture book', 'young reader']
};

function suggestGenres(title: string, author: string | undefined, tags: string | undefined): GenreSuggestion[] {
  const text = `${title} ${author || ''} ${tags || ''}`.toLowerCase();
  const suggestions: GenreSuggestion[] = [];

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Confidence based on number of matches relative to keyword count
      const confidence = Math.min(100, Math.round((matchedKeywords.length / keywords.length) * 200));
      suggestions.push({
        genre,
        confidence,
        matchedKeywords
      });
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { 
      bookId?: string; 
      title?: string; 
      author?: string; 
      tags?: string;
      applyGenre?: string;
    };

    // If applyGenre is provided, update the book's tags
    if (body.applyGenre && body.bookId) {
      const router = createDatabaseRouter(env);
      const db = router.queryForBook(body.bookId);
      const book = await db.prepare(
        'SELECT tags FROM books WHERE id = ?'
      ).bind(body.bookId).first() as { tags: string | null } | null;

      if (!book) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Book not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add genre to existing tags if not already present
      const existingTags = (book.tags || '').split(',').map(t => t.trim()).filter(t => t);
      if (!existingTags.includes(body.applyGenre)) {
        existingTags.push(body.applyGenre);
      }

      await db.prepare(
        'UPDATE books SET tags = ? WHERE id = ?'
      ).bind(existingTags.join(', '), body.bookId).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Genre applied successfully',
        tags: existingTags.join(', ')
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get book details if bookId provided
    let title = body.title;
    let author = body.author;
    let tags = body.tags;

    if (body.bookId && !title) {
      const router = createDatabaseRouter(env);
      const db = router.queryForBook(body.bookId);
      const book = await db.prepare(
        'SELECT title, author, tags FROM books WHERE id = ?'
      ).bind(body.bookId).first() as { title: string; author: string | null; tags: string | null } | null;

      if (!book) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Book not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      title = book.title;
      author = book.author ?? undefined;
      tags = book.tags ?? undefined;
    }

    if (!title) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Title is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const suggestions = suggestGenres(title, author || undefined, tags || undefined);

    return new Response(JSON.stringify({
      success: true,
      suggestions,
      note: 'These are suggestions. Please select the genres that apply to confirm.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Genre suggestion error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to suggest genres'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
