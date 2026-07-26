import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionRepository } from './session.repository';
import { CouchDbSessionRepository } from './couchdb-session.repository';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SessionRepository,
      useClass: CouchDbSessionRepository,
    },
  ],
  exports: [SessionRepository],
})
export class SessionModule {}