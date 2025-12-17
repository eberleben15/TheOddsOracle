import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@theoddsoracle.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Admin User'

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists!`)
      console.log(`   User ID: ${existingUser.id}`)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(), // Auto-verify admin email
      },
    })

    // Create account for credentials provider
    // Note: NextAuth credentials provider doesn't use the Account table,
    // but we'll create it for consistency
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id,
      },
    })

    // Create subscription with PRO tier for admin
    await prisma.subscription.create({
      data: {
        userId: user.id,
        status: 'PRO',
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Subscription: PRO`)
    console.log('')
    console.log('⚠️  IMPORTANT: Change the default password after first login!')
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()

