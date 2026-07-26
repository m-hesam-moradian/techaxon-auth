import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as nano from 'nano';
import couchdbConfig from '../config/couchdb.config';
import { SessionRepository, CreateSessionData, SessionDocument } from './session.repository';

@Injectable()
export class CouchDbSessionRepository implements SessionRepository, OnModuleInit {
  private couch!: nano.ServerScope;
  private db!: nano.DocumentScope<SessionDocument>;

  constructor(
    @Inject(couchdbConfig.KEY)
    private readonly config: ConfigType<typeof couchdbConfig>,
  ) {}

  onModuleInit() {
    this.couch = nano(this.config.url);
    this.db = this.couch.use(this.config.database);
  }

  async createSession(sessionId: string, sessionData: CreateSessionData) {
    const response = await this.db.insert({ _id: sessionId, ...sessionData } as any);
    return { id: response.id, rev: response.rev };
  }

  async getSession(sessionId: string): Promise<SessionDocument | null> {
    try {
      return await this.db.get(sessionId);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateSession(sessionData: SessionDocument) {
    const response = await this.db.insert(sessionData as any);
    return { id: response.id, rev: response.rev };
  }
}