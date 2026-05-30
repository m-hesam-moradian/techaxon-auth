import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export interface TokenPayload {
  userId: string;
  [key: string]: any;
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
