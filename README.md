# techaxon-auth-service
API-first authentication service with JWT access tokens, refresh token rotation, and multi-device session management.

Designing an API-first authentication system for web and mobile applications.

The system is based on a secure token architecture:

- Short-lived JWT access tokens (15 min TTL)
- Rotating refresh tokens (stored hashed in database)
- One active refresh token per device/session
- Device-aware session management
- Full session control (list, revoke, logout per device)

## Core Features

- Stateless authentication using JWT
- Secure refresh token rotation
- Multi-device session tracking
- Session revocation with immediate token invalidation
- Cross-platform support (Next.js, React Native, Flutter)

## API Design

- Authorization: Bearer <access_token>
- /auth/login
- /auth/refresh
- /auth/logout
- /auth/sessions

## Data Storage

CouchDB is used only as a persistence layer for:
- Users
- Sessions

No authentication logic is handled by the database layer.
