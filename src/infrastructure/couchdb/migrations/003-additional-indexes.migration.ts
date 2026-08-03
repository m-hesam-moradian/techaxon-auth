import { CouchDbService } from '../couchdb.service';
import type { CouchDbMigration } from './migration.interface';

export class AdditionalIndexesMigration implements CouchDbMigration {
  readonly name = '003-additional-indexes';

  constructor(private readonly couchDbService: CouchDbService) {}

  async up(): Promise<void> {
    const db = this.couchDbService.getDatabase();

    // 1. idx_claim_email
    await db.createIndex({
      name: 'idx_claim_email',
      type: 'json',
      index: {
        fields: ['type', 'email', 'status'],
      },
      ddoc: 'idx_claim_email'
    });

    // 2. idx_session_user (note: 002-session-index creates a similar one, this one includes status)
    await db.createIndex({
      name: 'idx_session_user',
      type: 'json',
      index: {
        fields: ['type', 'userId', 'status'],
      },
      ddoc: 'idx_session_user'
    });

    // 3. idx_session_cleanup (includes type, status, expiresAt)
    await db.createIndex({
      name: 'idx_session_cleanup',
      type: 'json',
      index: {
        fields: ['type', 'status', 'expiresAt'],
      },
      ddoc: 'idx_session_cleanup'
    });

    // 4. idx_verification_token
    await db.createIndex({
      name: 'idx_verification_token',
      type: 'json',
      index: {
        fields: ['type', 'token', 'status'],
      },
      ddoc: 'idx_verification_token'
    });

    console.log('✓ Additional indexes created.');
  }
}
