import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { CouchDbService } from './couchdb.service';

@Injectable()
export class CouchDbIndexService implements OnModuleInit {
  private readonly logger = new Logger(CouchDbIndexService.name);

  constructor(private readonly couchDbService: CouchDbService) {}

  async onModuleInit() {
    this.logger.log('Initializing CouchDB indexes...');

    // We need to wait for CouchDbService to initialize first.
    // In NestJS, dependencies are initialized before dependents.
    // However, onModuleInit doesn't have a strict execution order guarantee across modules unless explicitly awaited.
    // But since CouchDbIndexService and CouchDbService are in the same module,
    // and CouchDbIndexService depends on CouchDbService, CouchDbService should be initialized first.
    // CouchDbService initializes `this.db` synchronously in its `onModuleInit`.
    // We can safely access it here.

    const db = this.couchDbService.getDatabase();

    try {
      // 1. idx_user_email
      await db.createIndex({
        index: { fields: ['type', 'email'] },
        ddoc: 'idx_user_email',
        name: 'idx_user_email',
        type: 'json'
      });
      this.logger.log('Index created or verified: idx_user_email');

      // 2. idx_claim_email
      await db.createIndex({
        index: { fields: ['type', 'email', 'status'] },
        ddoc: 'idx_claim_email',
        name: 'idx_claim_email',
        type: 'json'
      });
      this.logger.log('Index created or verified: idx_claim_email');

      // 3. idx_session_user
      await db.createIndex({
        index: { fields: ['type', 'userId', 'status'] },
        ddoc: 'idx_session_user',
        name: 'idx_session_user',
        type: 'json'
      });
      this.logger.log('Index created or verified: idx_session_user');

      // 4. idx_session_cleanup
      await db.createIndex({
        index: { fields: ['type', 'status', 'expiresAt'] },
        ddoc: 'idx_session_cleanup',
        name: 'idx_session_cleanup',
        type: 'json'
      });
      this.logger.log('Index created or verified: idx_session_cleanup');

      this.logger.log('All CouchDB indexes initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize CouchDB indexes', error);
    }
  }
}
