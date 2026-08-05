import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class VerificationTokenIndexMigration implements CouchDbMigration {
  readonly name = '006-verification-token-index';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    await db.createIndex({
      name: 'idx_verification_token',
      type: 'json',
      index: {
        fields: ['type', 'token', 'status'],
      },
      ddoc: 'idx_verification_token',
    });
  }
}
