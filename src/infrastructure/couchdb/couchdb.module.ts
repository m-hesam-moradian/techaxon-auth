import { Global, Module } from '@nestjs/common';

import { CouchDbService } from './couchdb.service';
import { CouchDbIndexService } from './couchdb-index.service';
import { MigrationRunner } from './migrations/migration.runner';
import { MigrationRepository } from './migrations/migration.repository';

import { UserRepository } from '../../users/user.repository';

@Global()
@Module({
  providers: [
    CouchDbService,
    CouchDbIndexService,

    MigrationRepository,
    MigrationRunner,

    {
      provide: UserRepository,
      useExisting: CouchDbService,
    },
  ],
  exports: [CouchDbService, CouchDbIndexService, UserRepository],
})
export class CouchdbModule {}
