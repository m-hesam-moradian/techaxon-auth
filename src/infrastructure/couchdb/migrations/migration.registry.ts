import { CouchDbService } from '../couchdb.service';

import { UserEmailIndexMigration } from './001-user-email-index.migration';
import { SessionIndexMigration } from './002-session-index.migration';
import { AdditionalIndexesMigration } from './003-additional-indexes.migration';

import type { CouchDbMigration } from './migration.interface';

export function getMigrations(couchDbService: CouchDbService): CouchDbMigration[] {
  return [
    new UserEmailIndexMigration(couchDbService),
    new SessionIndexMigration(couchDbService),
    new AdditionalIndexesMigration(couchDbService)
  ];
}
