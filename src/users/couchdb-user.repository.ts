// src/users/couchdb-user.repository.ts

import { Injectable, ConflictException } from '@nestjs/common';

import { CouchDbService } from '../infrastructure/couchdb/couchdb.service';
import type { UserDocument } from '../infrastructure/couchdb/documents/user.document';
import { isUserDocument } from '../infrastructure/couchdb/documents/document.guards';

import { UserRepository, type CreateUserData, type CreateUserResult } from './user.repository';

@Injectable()
export class CouchDbUserRepository implements UserRepository {
  constructor(private readonly couchDbService: CouchDbService) {}

  /**
   * Shared CouchDB connection.
   */
  private get db() {
    return this.couchDbService.getDatabase();
  }

  /**
   * ------------------------------------------------------------------------
   * Create User Document
   * ------------------------------------------------------------------------
   */
  async createUser(user: CreateUserData): Promise<CreateUserResult> {
    const response = await this.db.insert(user);

    return {
      id: response.id,
      rev: response.rev,
    };
  }

  /**
   * ------------------------------------------------------------------------
   * Find User By Email
   * ------------------------------------------------------------------------
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const result = await this.db.find({
      selector: {
        type: 'user',
        email,
      },
      limit: 1,
    });

    if (result.docs.length === 0) {
      return null;
    }

    const doc = result.docs[0];

    if (!isUserDocument(doc)) {
      return null;
    }

    return doc;
  }

  /**
   * ------------------------------------------------------------------------
   * Atomically Reserve Email (email_claim)
   * ------------------------------------------------------------------------
   */
  async claimEmail(email: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      await this.db.insert({
        _id: `email:${email}`,
        type: 'email_claim',
        email,
        userId,
        createdAt: now,
        updatedAt: now, // اضافه شد تا با BaseDocument همخوانی داشته باشد
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 409
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  /**
   * ------------------------------------------------------------------------
   * Release Email Claim
   * ------------------------------------------------------------------------
   */
  async releaseEmailClaim(email: string): Promise<void> {
    try {
      const claimId = `email:${email}`;
      const doc = await this.db.get(claimId);
      await this.db.destroy(doc._id, doc._rev);
    } catch (error: unknown) {
      // اگر ۴۰۴ باشد به این معنی است که سند وجود ندارد یا قبلا پاک شده، پس نیازی به Throw نیست
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 404
      ) {
        return;
      }

      throw error;
    }
  }
}
