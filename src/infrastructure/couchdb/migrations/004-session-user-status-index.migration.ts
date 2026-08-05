import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class SessionUserStatusIndexMigration implements CouchDbMigration {
  readonly name = '004-session-user-status-index';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    await db.createIndex({
      name: 'idx_session_user',
      type: 'json',
      index: {
        fields: ['type', 'userId', 'status'],
      },
      ddoc: 'idx_session_user',
    });
  }
}
