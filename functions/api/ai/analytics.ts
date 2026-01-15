/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Reading Analytics API - Backend-only
 * GET /api/ai/analytics - Get reading statistics and insights
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

interface ReadingStats {
  totalBooks: number;
  booksRead: number;
  booksInProgress: number;
  totalReadingTime: number;
  averageProgress: number;
  topGenres: Array<{ genre: string; count: number }>;
  readingStreak: number;
  xp: number;
  level: number;
  achievements: string[];
}

interface ReadingSession {
  book_id: string;
  session_start: number;
  session_end: number;
  pages_read: number;
}

const genreKeywords: Record<string, string[]> = {
  'fantasy': ['magic', 'dragon', 'wizard', 'quest', 'realm'],
  'scifi': ['space', 'alien', 'future', 'robot', 'galaxy'],
  'mystery': ['detective', 'murder', 'crime', 'investigation'],
  'romance': ['love', 'heart', 'passion', 'romance'],
  'horror': ['horror', 'terror', 'haunted', 'ghost'],
  'biography': ['life', 'autobiography', 'memoir', 'biography'],
  'history': ['history', 'historical', 'war', 'ancient'],
  'business': ['business', 'entrepreneur', 'startup', 'marketing'],
  'selfhelp': ['self-help', 'motivation', 'success', 'habit']
};

function detectGenre(title: string, author: string | null, tags: string | null): string {
  const text = `${title} ${author || ''} ${tags || ''}`.toLowerCase();
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return genre;
      }
    }
  }
  
  return 'general';
}

function calculateLevel(xp: number): number {
  // XP thresholds for levels: 100, 300, 600, 1000, 1500...
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = level * 100 + 100;
  }
  
  return level;
}

function calculateAchievements(stats: Partial<ReadingStats>, sessions: ReadingSession[]): string[] {
  const achievements: string[] = [];
  
  if (stats.totalBooks && stats.totalBooks >= 1) achievements.push('First Book');
  if (stats.totalBooks && stats.totalBooks >= 10) achievements.push('Bookworm');
  if (stats.totalBooks && stats.totalBooks >= 50) achievements.push('Library Builder');
  if (stats.booksRead && stats.booksRead >= 5) achievements.push('Dedicated Reader');
  if (stats.booksRead && stats.booksRead >= 25) achievements.push('Book Master');
  if (stats.readingStreak && stats.readingStreak >= 7) achievements.push('Week Warrior');
  if (stats.readingStreak && stats.readingStreak >= 30) achievements.push('Month Champion');
  if (sessions.length >= 100) achievements.push('Session Star');
  
  return achievements;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Check cache first
    const cached = await env.KV_CACHE.get('reading_analytics');
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return new Response(JSON.stringify({
          success: true,
          analytics: parsed.data
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get all books from all databases
    const router = createDatabaseRouter(env);
    const booksResult = await router.queryAll(
      'SELECT id, title, author, tags FROM books'
    );

    // Get all progress from all databases
    const progressResult = await router.queryAll(
      'SELECT book_id, percent, last_read_at FROM progress'
    );

    // Get reading sessions from all databases
    const sessionsResult = await router.queryAll(
      'SELECT book_id, session_start, session_end, pages_read FROM reading_stats ORDER BY session_start DESC LIMIT 1000'
    );

    const books = (booksResult || []) as unknown as Array<{ title: string; author: string | null; tags: string | null }>;
    const progress = (progressResult || []) as unknown as Array<{ book_id: string; percent: number; last_read_at: number }>;
    const sessions = (sessionsResult || []) as unknown as ReadingSession[];

    // Calculate statistics
    const totalBooks = books.length;
    const booksWithProgress = progress.filter(p => p.percent > 0);
    const booksRead = progress.filter(p => p.percent >= 95).length;
    const booksInProgress = booksWithProgress.length - booksRead;

    // Average progress
    const averageProgress = booksWithProgress.length > 0
      ? booksWithProgress.reduce((sum, p) => sum + p.percent, 0) / booksWithProgress.length
      : 0;

    // Total reading time from sessions
    let totalReadingTime = 0;
    for (const session of sessions) {
      if (session.session_end && session.session_start) {
        totalReadingTime += (session.session_end - session.session_start);
      }
    }
    totalReadingTime = Math.round(totalReadingTime / 1000 / 60); // Convert to minutes

    // Genre analysis
    const genreCounts: Record<string, number> = {};
    for (const book of books) {
      const genre = detectGenre(book.title, book.author, book.tags);
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }

    const topGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Reading streak calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    const sortedProgress = [...progress].sort((a, b) => b.last_read_at - a.last_read_at);

    for (let i = 0; i < 365; i++) {
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const hasReading = sortedProgress.some(p => 
        p.last_read_at >= dayStart && p.last_read_at < dayEnd
      );

      if (hasReading) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Allow today to not have reading yet
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate XP
    let xp = 0;
    xp += totalBooks * 10; // 10 XP per book added
    xp += booksRead * 50; // 50 XP per book completed
    xp += Math.floor(totalReadingTime / 10) * 5; // 5 XP per 10 minutes read
    xp += streak * 10; // 10 XP per streak day

    const level = calculateLevel(xp);

    const stats: ReadingStats = {
      totalBooks,
      booksRead,
      booksInProgress,
      totalReadingTime,
      averageProgress: Math.round(averageProgress),
      topGenres,
      readingStreak: streak,
      xp,
      level,
      achievements: calculateAchievements({ totalBooks, booksRead, readingStreak: streak }, sessions)
    };

    // Cache the results
    await env.KV_CACHE.put('reading_analytics', JSON.stringify({
      timestamp: Date.now(),
      data: stats
    }), { expirationTtl: 600 }); // 10 minutes

    return new Response(JSON.stringify({
      success: true,
      analytics: stats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate analytics'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
