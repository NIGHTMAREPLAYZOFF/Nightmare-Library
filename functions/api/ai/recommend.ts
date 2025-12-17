/**
 * AI Recommendations API - Backend-only
 * POST /api/ai/recommend - Get book recommendations based on reading history
 */

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
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
    const currentBook = await env.DB.prepare(
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

    // Get all other books
    const allBooks = await env.DB.prepare(
      'SELECT id, title, author, tags, last_read_at FROM books WHERE id != ? ORDER BY last_read_at DESC LIMIT 100'
    ).bind(bookId).all();

    if (!allBooks.results || allBooks.results.length === 0) {
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

    for (const book of allBooks.results as unknown as Book[]) {
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
