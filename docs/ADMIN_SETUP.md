# Admin Setup

## Overview

The admin dashboard is restricted to admin users only. Regular users can see predictions on matchup pages, but admin-specific features (performance metrics, validation results, etc.) are only available to admins.

## Setting Up Admin Access

### 1. Configure Admin Email

Add your email address to `.env.local`:

```env
ADMIN_EMAIL=your-email@example.com
```

The admin check compares the logged-in user's email to this environment variable (case-insensitive).

### 2. Admin Features

Once configured, you'll have access to:

- **Admin Dashboard** (`/admin/predictions`): Performance metrics, validation results, prediction analytics
- **Admin API** (`/api/admin/performance`): Programmatic access to performance data

### 3. Regular Users

Regular (non-admin) users can still:
- ✅ View predictions on matchup pages (`/matchup/[id]`)
- ✅ See AI-powered predictions and betting insights
- ❌ Cannot access admin dashboard
- ❌ Cannot see performance metrics

## Future: Premium Features

Predictions on matchup pages may become a premium feature in the future. When that happens, access will be controlled by subscription status in the database.

## Security Notes

- Admin access is currently based on email matching
- For production, consider:
  - Adding a `role` field to the User model
  - Using more robust authorization (e.g., role-based access control)
  - Adding audit logging for admin actions

