/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * EPUB Metadata Extraction API
 * POST /api/books/metadata - Extract metadata from EPUB
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No file provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic EPUB metadata extraction
    const file = fileEntry as File;
    const arrayBuffer = await file.arrayBuffer();
    const metadata = await extractEpubMetadata(arrayBuffer);

    return new Response(JSON.stringify({ 
      success: true,
      metadata
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Metadata extraction error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to extract metadata' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function extractEpubMetadata(arrayBuffer: ArrayBuffer): Promise<any> {
  // Simple metadata extraction from EPUB
  const decoder = new TextDecoder();
  const text = decoder.decode(arrayBuffer.slice(0, 5000));
  
  const metadata: any = {
    title: null,
    author: null,
    publisher: null,
    description: null,
    publicationDate: null,
    language: null,
    isbn: null
  };

  // Extract title
  const titleMatch = text.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  if (titleMatch) metadata.title = titleMatch[1];

  // Extract author
  const authorMatch = text.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  if (authorMatch) metadata.author = authorMatch[1];

  // Extract publisher
  const publisherMatch = text.match(/<dc:publisher[^>]*>([^<]+)<\/dc:publisher>/i);
  if (publisherMatch) metadata.publisher = publisherMatch[1];

  // Extract description
  const descMatch = text.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/i);
  if (descMatch) metadata.description = descMatch[1];

  // Extract date
  const dateMatch = text.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i);
  if (dateMatch) metadata.publicationDate = dateMatch[1];

  // Extract language
  const langMatch = text.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/i);
  if (langMatch) metadata.language = langMatch[1];

  // Extract ISBN
  const isbnMatch = text.match(/<dc:identifier[^>]*>(?:urn:isbn:)?([0-9-]+)<\/dc:identifier>/i);
  if (isbnMatch) metadata.isbn = isbnMatch[1];

  return metadata;
}
