import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class SessionIndexMigration implements CouchDbMigration {
  readonly name = '002-session-index';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    /**
     * Find all sessions belonging to a user.
     *
     * Used by:
     * - Session dashboard
     * - Logout all devices
     * - Security settings
     */
    await db.createIndex({
      name: 'session-user-index',
      type: 'json',
      index: {
        fields: ['type', 'userId'],
      },
    });

    /**
     * Lookup a session by refresh token hash.
     *
     * Used during refresh token rotation.
     */
    await db.createIndex({
      name: 'session-refresh-token-index',
      type: 'json',
      index: {
        fields: ['type', 'refreshTokenHash'],
      },
    });

    /**
     * Find expired sessions.
     *
     * Used by scheduled cleanup jobs.
     */
    await db.createIndex({
      name: 'session-expiration-index',
      type: 'json',
      index: {
        fields: ['type', 'expiresAt'],
      },
    });

    console.log('✓ Session indexes created.');
  }
}
