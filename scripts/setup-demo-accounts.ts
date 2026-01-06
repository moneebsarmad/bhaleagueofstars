/**
 * Setup demo accounts for testing all user roles
 *
 * Creates:
 * - Demo Admin (for admin app)
 * - Demo Staff (for portal - staff role)
 * - Demo Parent (for portal - parent role)
 * - Demo Student (for portal - student role)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bvohvpwptmibveegccgf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEMO_PASSWORD = 'Demo123!'

const DEMO_ACCOUNTS = [
  {
    email: 'demo.admin@demo.leagueofstars.com',
    name: 'Demo Admin',
    role: 'admin',
    description: 'Use this account to log into the Admin app'
  },
  {
    email: 'demo.staff@demo.leagueofstars.com',
    name: 'Demo Teacher',
    role: 'staff',
    description: 'Use this account to log into the Portal as Staff'
  },
  {
    email: 'demo.parent@demo.leagueofstars.com',
    name: 'Demo Parent',
    role: 'parent',
    description: 'Use this account to log into the Portal as Parent'
  },
  {
    email: 'demo.student@demo.leagueofstars.com',
    name: 'Demo Student',
    role: 'student',
    description: 'Use this account to log into the Portal as Student'
  },
]

async function main() {
  console.log('🎭 Setting up Demo Accounts')
  console.log('============================\n')

  // Get existing users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingEmails = new Set(authData?.users.map(u => u.email?.toLowerCase()) || [])

  for (const account of DEMO_ACCOUNTS) {
    console.log(`\n📧 ${account.name} (${account.role})`)
    console.log(`   ${account.email}`)

    if (existingEmails.has(account.email.toLowerCase())) {
      // Update existing user
      const user = authData?.users.find(u => u.email?.toLowerCase() === account.email.toLowerCase())
      if (user) {
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          password: DEMO_PASSWORD,
          user_metadata: { full_name: account.name, role: account.role }
        })
        if (error) {
          console.log(`   ❌ Failed to update: ${error.message}`)
        } else {
          console.log(`   ✅ Updated existing account`)
        }
      }
    } else {
      // Create new user
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.name, role: account.role }
      })

      if (error) {
        console.log(`   ❌ Failed to create: ${error.message}`)
      } else {
        console.log(`   ✅ Created new account`)

        // Add to appropriate table based on role
        if (account.role === 'admin') {
          await supabase.from('admins').upsert({
            user_id: newUser.user.id,
            email: account.email,
            display_name: account.name,
            is_super_admin: false
          }, { onConflict: 'user_id' })
          console.log(`   ✅ Added to admins table`)
        } else if (account.role === 'staff') {
          await supabase.from('staff').upsert({
            user_id: newUser.user.id,
            email: account.email,
            name: account.name,
            role: 'Teacher'
          }, { onConflict: 'user_id' })
          console.log(`   ✅ Added to staff table`)
        } else if (account.role === 'student') {
          // Check if demo student exists
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('email', account.email)
            .single()

          if (!existingStudent) {
            await supabase.from('students').insert({
              user_id: newUser.user.id,
              email: account.email,
              name: account.name,
              house: 'House of Abū Bakr',
              grade: '10',
              total_points: 150
            })
            console.log(`   ✅ Added to students table`)
          }
        } else if (account.role === 'parent') {
          // Parents link to students - we'll create a simple record
          const { data: existingParent } = await supabase
            .from('parents')
            .select('id')
            .eq('email', account.email)
            .single()

          if (!existingParent) {
            // First check if parents table exists
            const { error: parentError } = await supabase.from('parents').insert({
              user_id: newUser.user.id,
              email: account.email,
              name: account.name
            })
            if (parentError && parentError.code !== '42P01') {
              // Table might not exist, that's ok for now
              console.log(`   ⚠️  Parents table may not exist yet`)
            } else {
              console.log(`   ✅ Added to parents table`)
            }
          }
        }
      }
    }
  }

  console.log('\n============================')
  console.log('🎭 DEMO CREDENTIALS')
  console.log('============================\n')
  console.log(`Password for all accounts: ${DEMO_PASSWORD}\n`)

  console.log('┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ Role     │ Email                                │ App              │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  for (const account of DEMO_ACCOUNTS) {
    const app = account.role === 'admin' ? 'Admin (3001)' : 'Portal (3002)'
    console.log(`│ ${account.role.padEnd(8)} │ ${account.email.padEnd(36)} │ ${app.padEnd(16)} │`)
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘')

  console.log('\n✨ Done!')
}

main().catch(console.error)
