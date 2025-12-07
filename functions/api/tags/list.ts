
import { generateTagItemSnippet } from '../../html-snippets';

export async function onRequest(context: any) {
  const { env } = context;

  try {
    // Get all unique tags from books
    const books = await env.DB.prepare(
      'SELECT tags FROM books WHERE tags IS NOT NULL AND tags != ""'
    ).all();

    const tagsSet = new Set<string>();
    books.results.forEach((book: any) => {
      if (book.tags) {
        book.tags.split(',').forEach((tag: string) => {
          const trimmed = tag.trim();
          if (trimmed) tagsSet.add(trimmed);
        });
      }
    });

    const tags = Array.from(tagsSet).map(tag => ({
      name: tag,
      snippet_html: generateTagItemSnippet(tag)
    }));

    return Response.json({
      success: true,
      tags
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: 'Failed to load tags'
    }, { status: 500 });
  }
}
