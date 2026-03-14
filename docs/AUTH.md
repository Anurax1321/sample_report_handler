# Authentication & Security

## Overview

The application uses JWT-based authentication with admin roles, rate limiting, and audit logging.

## Authentication

All API endpoints (except `/auth/login` and `/health`) require a valid JWT token in the `Authorization: Bearer <token>` header.

### Login Flow

1. `POST /auth/login` with `{username, password}`
2. Server validates credentials, returns JWT token + user info (including `is_admin`)
3. Frontend stores token in `localStorage`, attaches to all API requests
4. Token expires after 8 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

### JWT Structure

- **Algorithm**: HS256
- **Subject (`sub`)**: username
- **Secret**: Set via `JWT_SECRET_KEY` env var (random per restart in dev if not set)

## Admin Roles

### How It Works

Users have an `is_admin` boolean flag. Admin-only endpoints use the `require_admin` dependency which checks this flag and returns 403 if not set.

### Admin-Only Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/register` | Create new users |
| `GET /auth/users` | List all users |
| `PATCH /auth/users/{id}/toggle-active` | Enable/disable users |

### Frontend Behavior

- **Header dropdown**: Shows "Manage Users" link only for admins
- **Role display**: Shows "Admin" or "User" in profile dropdown
- **UserManagement page**: Redirects non-admins to home
- **User table**: Shows "Role" column with Admin/User badges

### Setting Up Admin

The seeded admin user (`seed_admin.py`) has `is_admin=True` by default. The migration also sets `is_admin=true` for any existing user with `username='admin'`.

```bash
# Inside Docker container
docker exec sample-report-backend python seed_admin.py

# Or with custom credentials
docker exec sample-report-backend python seed_admin.py --username myadmin --password mypass
```

## Profile Management

### Username Change

`PATCH /auth/profile` with `{username: "new_name"}`

- Validates minimum 2 characters
- Checks uniqueness
- Returns a **new JWT token** (since JWT encodes username as `sub`)
- Frontend automatically updates stored token and user state

### Password Change

`POST /auth/change-password` with `{current_password, new_password}`

- Validates current password
- Minimum 8 characters for new password

## Rate Limiting

Powered by [slowapi](https://github.com/laurentS/slowapi) (built on top of `limits`).

### Configuration

| Scope | Limit | Rationale |
|-------|-------|-----------|
| Global default | 60 requests/minute | General protection |
| `POST /auth/login` | 10 requests/minute | Brute-force prevention |
| `POST /auth/register` | Exempt | Already admin-only |

### How It Works

- Rate limits are tracked per client IP (`X-Forwarded-For` or remote address)
- When exceeded, returns HTTP 429 with `{"detail": "Too many requests. Please try again later."}`
- Limits reset after the window passes (1 minute)

### Backend Implementation

```python
# app/core/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
```

```python
# app/main.py
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"detail": "Too many requests..."})
```

```python
# On specific route
@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, ...):
```

## Audit Logging

### What Gets Logged

| Action | Entity | Details Captured |
|--------|--------|-----------------|
| `create` | sample | sample ID |
| `update` | sample | list of changed fields |
| `delete` | sample | sample_code |
| `upload` | report | report ID |
| `approve` | report | report ID |
| `delete` | report | report ID |

### Database Table

```sql
audit_logs
├── id          (primary key)
├── user_id     (FK → users.id)
├── action      (string: create, update, delete, upload, approve)
├── entity_type (string: sample, report)
├── entity_id   (int, nullable)
├── details     (JSON, nullable)
└── timestamp   (datetime)
```

### Tracking Fields on Entities

| Table | Field | Purpose |
|-------|-------|---------|
| `samples` | `created_by_id` | Who created the sample |
| `samples` | `updated_by_id` | Who last updated the sample |
| `reports` | `uploaded_by_id` | Who uploaded the report |

### Querying Audit Logs

```bash
# View recent audit entries
docker exec sample-report-db psql -U sample_user -d sample_report_db \
  -c "SELECT id, user_id, action, entity_type, entity_id, details, timestamp FROM audit_logs ORDER BY id DESC LIMIT 20;"
```

## Security Considerations

- Passwords are hashed with bcrypt (passlib)
- JWT secret should be set explicitly in production (`JWT_SECRET_KEY` env var)
- Rate limiting protects against brute-force attacks
- Admin role prevents unauthorized user management
- All mutating operations on samples/reports require authentication
- Audit trail provides accountability
