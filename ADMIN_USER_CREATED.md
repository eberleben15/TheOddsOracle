# Admin User Created! ✅

## Login Credentials

**Email**: `admin@theoddsoracle.com`  
**Password**: `admin123`  
**Subscription**: PRO

## How to Login

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Visit the sign-in page:
   ```
   http://localhost:3005/auth/signin
   ```

3. Use the email/password form:
   - Enter: `admin@theoddsoracle.com`
   - Enter: `admin123`
   - Click "Sign In"

## ⚠️ Important Security Note

**Change the default password immediately after first login!**

The default password is `admin123` - this is not secure for production use.

## What Was Created

- ✅ User account in database
- ✅ Credentials provider account (for email/password login)
- ✅ PRO subscription tier
- ✅ Email verified (no email verification needed)

## Next Steps

1. **Test the login** - Make sure you can sign in
2. **Change the password** - Implement a password change feature or update manually
3. **Configure OAuth** - Set up Google OAuth if you want that option too

## Updating the Password

To update the password manually, you can:

1. Hash a new password:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-new-password', 10).then(hash => console.log(hash));"
   ```

2. Update in database:
   ```sql
   UPDATE oddsoracle.accounts 
   SET "providerAccountId" = 'your-hashed-password-here'
   WHERE provider = 'credentials' 
   AND "userId" = (SELECT id FROM oddsoracle.users WHERE email = 'admin@theoddsoracle.com');
   ```

## Creating Additional Admin Users

You can create more admin users by running the same SQL commands or by using the sign-up flow and then updating their subscription to PRO in the database.

