// src/sessions/session.service.ts

import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import { SessionRepository, type CreateSessionData } from './session.repository';

import type { SessionDocument } from '../infrastructure/couchdb/documents/session.document';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Creates a new authenticated session.
   */
  async createSession(
    userId: string,
    refreshTokenHash: string,
    expiresAt: string,
  ): Promise<SessionDocument> {
    const now = new Date().toISOString();

    const sessionId = `session:${uuidv7()}`;

    const session: CreateSessionData = {
      type: 'session',

      userId,

      refreshTokenHash,

      status: 'active',

      expiresAt,

      lastAccessedAt: now,

      createdAt: now,

      updatedAt: now,
    };

    const result = await this.sessionRepository.createSession(sessionId, session);

    return {
      _id: result.id,

      _rev: result.rev,

      ...session,
    };
  }
}
