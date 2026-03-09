# Backend API for API Debugger

## Overview
Minimal backend service for:
- User authentication
- Sync collections and saved requests
- Store user preferences

## Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Collections
- `GET /api/collections` - Get user's collections
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

### Saved Requests
- `GET /api/saved-requests` - Get all user's saved requests
- `POST /api/saved-requests` - Save request
- `PUT /api/saved-requests/:id` - Update saved request
- `DELETE /api/saved-requests/:id` - Delete saved request

### Sync
- `POST /api/sync/push` - Push local changes
- `GET /api/sync/pull` - Pull remote changes

## Data Storage
Using in-memory storage for MVP. Replace with database later.

## Future
- PostgreSQL integration
- Stripe billing
- Rate limiting
- Email verification
