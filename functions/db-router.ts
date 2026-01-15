/// <reference lib="webworker" />
/**
 * Database Router for Sharding
 * Distributes queries across 10 Cloudflare D1 databases
 * Uses consistent hashing to determine which database stores which book
 */

/**
 * Consistent hash function to determine which database a book belongs to
 * Returns a number 0-9 representing which database to use
 */
function hashBookId(bookId: string): number {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    const char = bookId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 10; // Return 0-9
}

/**
 * Get the appropriate database for a book ID
 */
export function getDbForBookId(databases: D1Database[], bookId: string): D1Database {
  const dbIndex = hashBookId(bookId);
  return databases[dbIndex];
}

/**
 * Database Router - provides query interface across sharded databases
 */
export class DatabaseRouter {
  private databases: D1Database[];

  constructor(databases: D1Database[]) {
    if (databases.length !== 10) {
      throw new Error('DatabaseRouter requires exactly 10 D1 databases');
    }
    this.databases = databases;
  }

  /**
   * Query a specific database by index
   */
  private getDb(index: number): D1Database {
    if (index < 0 || index >= 10) {
      throw new Error(`Database index ${index} out of range [0-9]`);
    }
    return this.databases[index];
  }

  /**
   * Query database for a specific book
   */
  queryForBook(bookId: string) {
    const dbIndex = hashBookId(bookId);
    return {
      prepare: (sql: string) => this.getDb(dbIndex).prepare(sql),
      execute: (sql: string) => this.getDb(dbIndex).exec(sql),
      batch: (statements: any[]) => this.getDb(dbIndex).batch(statements)
    };
  }

  /**
   * Query all databases (used for listing)
   * Returns results aggregated from all databases
   */
  async queryAll(sql: string, mapFn?: (row: any) => any) {
    const results: any[] = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const dbResult = await this.getDb(i).prepare(sql).all();
        if (dbResult.success && dbResult.results) {
          const mapped = mapFn 
            ? dbResult.results.map(mapFn)
            : dbResult.results;
          results.push(...mapped);
        }
      } catch (error) {
        console.error(`Error querying database ${i}:`, error);
        // Continue with other databases
      }
    }
    
    return results;
  }

  /**
   * Batch execute across all databases
   */
  async batchExecuteAll(statements: any[]) {
    const results: any = {};
    
    for (let i = 0; i < 10; i++) {
      try {
        results[`db_${i}`] = await this.getDb(i).batch(statements);
      } catch (error) {
        console.error(`Error batch executing on database ${i}:`, error);
        results[`db_${i}`] = { success: false, error };
      }
    }
    
    return results;
  }

  /**
   * Get database index for a book ID (for debugging/monitoring)
   */
  getDbIndex(bookId: string): number {
    return hashBookId(bookId);
  }

  /**
   * Get all database instances
   */
  getAllDatabases(): D1Database[] {
    return this.databases;
  }
}

/**
 * Helper to create router from environment
 * Expects DB_1 through DB_10 in the environment
 */
export function createDatabaseRouter(env: any): DatabaseRouter {
  const databases: D1Database[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const dbKey = `DB_${i}`;
    if (!env[dbKey]) {
      throw new Error(`Missing database binding: ${dbKey}. Ensure all 10 databases (DB_1 to DB_10) are configured in Cloudflare.`);
    }
    databases.push(env[dbKey]);
  }
  
  return new DatabaseRouter(databases);
}
