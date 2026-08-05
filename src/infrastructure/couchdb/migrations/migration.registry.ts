import { CouchDbService } from '../couchdb.service';

import { UserEmailIndexMigration } from './001-user-email-index.migration';
import { SessionIndexMigration } from './002-session-index.migration';
import { ClaimEmailIndexMigration } from './003-claim-email-index.migration';
import { SessionUserStatusIndexMigration } from './004-session-user-status-index.migration';
import { SessionCleanupIndexMigration } from './005-session-cleanup-index.migration';
import { VerificationTokenIndexMigration } from './006-verification-token-index.migration';

import type { CouchDbMigration } from './migration.interface';

export function getMigrations(couchDbService: CouchDbService): CouchDbMigration[] {
  return [
    new UserEmailIndexMigration(couchDbService),
    new SessionIndexMigration(couchDbService),
    new ClaimEmailIndexMigration(couchDbService),
    new SessionUserStatusIndexMigration(couchDbService),
    new SessionCleanupIndexMigration(couchDbService),
    new VerificationTokenIndexMigration(couchDbService),
  ];
}
