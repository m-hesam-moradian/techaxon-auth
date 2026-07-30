import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class UserEmailIndexMigration implements CouchDbMigration {
  name = '001-user-email-index';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    await db.createIndex({
      name: 'user-email-index',
      type: 'json',
      index: {
        fields: ['type', 'email'],
      },
    });
  }
}
