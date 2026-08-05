import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class SessionCleanupIndexMigration implements CouchDbMigration {
  readonly name = '005-session-cleanup-index';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    await db.createIndex({
      name: 'idx_session_cleanup',
      type: 'json',
      index: {
        fields: ['type', 'status', 'expiresAt'],
      },
      ddoc: 'idx_session_cleanup',
    });
  }
}
