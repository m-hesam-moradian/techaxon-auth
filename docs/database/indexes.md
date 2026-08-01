# CouchDB Indexing Strategy

This document details the indexing strategy used in our central database (`techaxon_core`) to support the Auth flow (Register, Login, Refresh, Logout, and Logout All Devices).

## Mango JSON Indexes

We use Mango JSON Indexes (`db.find`) for fields requiring exact matches, resulting in fast `O(log N)` lookup speeds.

The application automatically checks and creates these 4 essential indexes upon startup via `CouchDbIndexService`:

1. **`idx_user_email`**: Index on fields `["type", "email"]`
   - Purpose: Used for Login and Register email lookups.

2. **`idx_claim_email`**: Index on fields `["type", "email", "status"]`
   - Purpose: Used to query and verify email claims.

3. **`idx_session_user`**: Index on fields `["type", "userId", "status"]`
   - Purpose: Facilitates "Logout All Devices" and `findByUserId` lookups for active sessions.

4. **`idx_session_cleanup`**: Index on fields `["type", "status", "expiresAt"]`
   - Purpose: Helps identify and clean up expired sessions automatically.

## Full-Text Search (Apache Lucene/Clouseau)

Full-Text Search (using Apache Lucene/Clouseau) is purposely deferred. While highly useful for partial match queries and content-heavy modules (like LMS course searches), it isn't necessary for the Auth flow, which relies on strict, exact-value queries for security and performance.
