import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import couchdbConfig from './config/couchdb.config';

import { CouchdbModule } from './infrastructure/couchdb/couchdb.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './sessions/session.module'; // <-- Added our Session module

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [couchdbConfig],
    }),

    CouchdbModule,
    AuthModule,
    SessionModule, // <-- Turned it on here!
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}