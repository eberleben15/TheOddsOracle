import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@theoddsoracle.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Admin User'

  try {
    console.log('🔐 Creating admin user...')
    console.log(`   Email: ${email}`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists!`)
      console.log(`   User ID: ${existingUser.id}`)
      
      // Update existing user to be admin
      const account = await prisma.account.findFirst({
        where: {
          userId: existingUser.id,
          provider: 'credentials',
        },
      })

      if (account) {
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.account.update({
          where: { id: account.id },
          data: {
            providerAccountId: hashedPassword, // Store hash temporarily
          },
        })
        console.log('✅ Updated existing user password')
      } else {
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: hashedPassword,
          },
        })
        console.log('✅ Added credentials to existing user')
      }

      // Ensure PRO subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId: existingUser.id },
      })

      if (!subscription) {
        await prisma.subscription.create({
          data: {
            userId: existingUser.id,
            status: 'PRO',
          },
        })
        console.log('✅ Created PRO subscription')
      } else if (subscription.status !== 'PRO') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'PRO' },
        })
        console.log('✅ Updated subscription to PRO')
      }

      await prisma.$disconnect()
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

    // Create credentials account (storing hash in providerAccountId temporarily)
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: hashedPassword, // Store password hash here
      },
    })

    // Create PRO subscription for admin
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
    console.log('')
    console.log('📝 You can now login at: http://localhost:3005/auth/signin')
    console.log('   Use "Sign in with Credentials" or the email/password form')
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()

