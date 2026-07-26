import { Injectable } from '@nestjs/common';

import { CouchDbService } from '../infrastructure/couchdb/couchdb.service';

import type { SessionDocument } from '../infrastructure/couchdb/documents/session.document';

import {
  SessionRepository,
  type CreateSessionData,
  type RepositoryResult,
} from './session.repository';

@Injectable()
export class CouchDbSessionRepository implements SessionRepository {
  constructor(private readonly couchDbService: CouchDbService) {}

  /**
   * Shared CouchDB connection.
   */
  private get db() {
    return this.couchDbService.getDatabase();
  }

  /**
   * Create a new session.
   */
  async createSession(sessionId: string, session: CreateSessionData): Promise<RepositoryResult> {
    const response = await this.db.insert({
      _id: sessionId,
      ...session,
    });

    return {
      id: response.id,
      rev: response.rev,
    };
  }

  /**
   * Find session by id.
   */
  async findById(sessionId: string): Promise<SessionDocument | null> {
    try {
      const document = await this.db.get(sessionId);

      return document as SessionDocument;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Find all sessions of a user.
   */
  async findByUserId(userId: string): Promise<SessionDocument[]> {
    const result = await this.db.find({
      selector: {
        type: 'session',
        userId,
      },
    });

    return result.docs as SessionDocument[];
  }

  /**
   * Find a session using the refresh token hash.
   */
  async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionDocument | null> {
    const result = await this.db.find({
      selector: {
        type: 'session',
        refreshTokenHash,
      },
      limit: 1,
    });

    if (result.docs.length === 0) {
      return null;
    }

    return result.docs[0] as SessionDocument;
  }

  /**
   * Update an existing session.
   */
  async updateSession(session: SessionDocument): Promise<RepositoryResult> {
    const response = await this.db.insert(session);

    return {
      id: response.id,
      rev: response.rev,
    };
  }

  /**
   * Revoke one session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);

    if (!session) {
      return;
    }

    session.status = 'revoked';
    session.revokedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    await this.db.insert(session);
  }

  /**
   * Revoke every active session of a user.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.findByUserId(userId);

    const now = new Date().toISOString();

    for (const session of sessions) {
      session.status = 'revoked';
      session.revokedAt = now;
      session.updatedAt = now;

      await this.db.insert(session);
    }
  }

  /**
   * Permanently delete one session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);

    if (!session?._rev) {
      return;
    }

    await this.db.destroy(sessionId, session._rev);
  }

  /**
   * Delete expired sessions.
   *
   * Returns the number of deleted sessions.
   */
  async deleteExpiredSessions(before: string): Promise<number> {
    const result = await this.db.find({
      selector: {
        type: 'session',
        expiresAt: {
          $lt: before,
        },
      },
    });

    let deleted = 0;

    for (const session of result.docs as SessionDocument[]) {
      if (!session._id || !session._rev) {
        continue;
      }

      await this.db.destroy(session._id, session._rev);
      deleted++;
    }

    return deleted;
  }
}
