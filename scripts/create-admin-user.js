// Load environment variables
require('dotenv').config({ path: '.env' })

// Use direct database connection
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Get database connection from env
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment')
  process.exit(1)
}

const url = new URL(connectionString)
const schema = url.searchParams.get('schema') || 'oddsoracle'

const pool = new Pool({ connectionString })

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@theoddsoracle.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Admin User'

  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schema}, public`)
    
    console.log('🔐 Creating/updating admin user...')
    console.log(`   Email: ${email}`)

    // Check if user already exists
    const userResult = await client.query(
      'SELECT id, email, name FROM oddsoracle.users WHERE email = $1',
      [email]
    )

    let userId
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id
      console.log(`⚠️  User with email ${email} already exists!`)
      console.log(`   User ID: ${userId}`)
      
      // Check if credentials account exists
      const accountResult = await client.query(
        'SELECT id FROM oddsoracle.accounts WHERE "userId" = $1 AND provider = $2',
        [userId, 'credentials']
      )

      const hashedPassword = await bcrypt.hash(password, 10)
      
      if (accountResult.rows.length > 0) {
        // Update existing password
        await client.query(
          'UPDATE oddsoracle.accounts SET "providerAccountId" = $1 WHERE id = $2',
          [hashedPassword, accountResult.rows[0].id]
        )
        console.log('✅ Updated existing user password')
      } else {
        // Create credentials account
        const accountId = require('crypto').randomUUID()
        await client.query(
          'INSERT INTO oddsoracle.accounts (id, "userId", type, provider, "providerAccountId") VALUES ($1, $2, $3, $4, $5)',
          [accountId, userId, 'credentials', 'credentials', hashedPassword]
        )
        console.log('✅ Added credentials to existing user')
      }

      // Ensure PRO subscription
      const subResult = await client.query(
        'SELECT id, status FROM oddsoracle.subscriptions WHERE "userId" = $1',
        [userId]
      )

      if (subResult.rows.length === 0) {
        const subId = require('crypto').randomUUID()
        await client.query(
          'INSERT INTO oddsoracle.subscriptions (id, "userId", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
          [subId, userId, 'PRO']
        )
        console.log('✅ Created PRO subscription')
      } else if (subResult.rows[0].status !== 'PRO') {
        await client.query(
          'UPDATE oddsoracle.subscriptions SET status = $1 WHERE id = $2',
          ['PRO', subResult.rows[0].id]
        )
        console.log('✅ Updated subscription to PRO')
      }

      console.log('')
      console.log('✅ Admin user updated successfully!')
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${password}`)
      console.log(`   Subscription: PRO`)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    userId = require('crypto').randomUUID()
    await client.query(
      'INSERT INTO oddsoracle.users (id, email, name, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [userId, email, name, new Date()]
    )

    // Create credentials account
    const accountId = require('crypto').randomUUID()
    await client.query(
      'INSERT INTO oddsoracle.accounts (id, "userId", type, provider, "providerAccountId") VALUES ($1, $2, $3, $4, $5)',
      [accountId, userId, 'credentials', 'credentials', hashedPassword]
    )

    // Create PRO subscription for admin
    const subId = require('crypto').randomUUID()
    await client.query(
      'INSERT INTO oddsoracle.subscriptions (id, "userId", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
      [subId, userId, 'PRO']
    )

    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Subscription: PRO`)
    console.log('')
    console.log('⚠️  IMPORTANT: Change the default password after first login!')
    console.log('')
    console.log('📝 You can now login at: http://localhost:3005/auth/signin')
    console.log('   Use the email/password form to sign in')
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

createAdminUser()
