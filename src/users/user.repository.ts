import type { UserDocument } from '../infrastructure/couchdb/documents/user.document';

export interface CreateUserResult {
  id: string;
  rev: string;
}

export type CreateUserData = Omit<UserDocument, '_id' | '_rev'>;

export abstract class UserRepository {
  abstract createUser(user: CreateUserData): Promise<CreateUserResult>;

  abstract findByEmail(email: string): Promise<UserDocument | null>;

  abstract claimEmail(email: string, userId: string): Promise<void>;

  abstract releaseEmailClaim(email: string): Promise<void>;
}
