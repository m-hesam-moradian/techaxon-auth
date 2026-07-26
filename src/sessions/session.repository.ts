export interface CreateSessionData {
  type: 'session';
  userId: string;
  hashedRefreshToken: string;
  deviceInfo: string;
  userAgent: string;
  ip: string;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionDocument = CreateSessionData & {
  _id?: string;
  _rev?: string;
};

export abstract class SessionRepository {
  abstract createSession(sessionId: string, sessionData: CreateSessionData): Promise<{ id: string; rev: string }>;
  abstract getSession(sessionId: string): Promise<SessionDocument | null>;
  abstract updateSession(sessionData: SessionDocument): Promise<{ id: string; rev: string }>;
}