/**
 * LEAGUE OF STARS - Bulk Staff Account Setup Script
 *
 * This script creates auth accounts and profiles for all staff members
 * with appropriate RBAC roles assigned.
 *
 * Prerequisites:
 * 1. You need the Supabase SERVICE_ROLE_KEY (from Supabase Dashboard > Settings > API)
 * 2. Run: npm install @supabase/supabase-js
 *
 * Usage:
 * SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx scripts/setup-staff-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = 'https://bvohvpwptmibveegccgf.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.error('   Get it from: Supabase Dashboard > Settings > API > service_role key')
  console.error('')
  console.error('   Usage: SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx scripts/setup-staff-accounts.ts')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Role mapping from staff.role to RBAC role
const ROLE_MAPPING: Record<string, string> = {
  // Specific overrides (these emails get specific roles)
  // House mentors are set separately with assigned_house

  // Staff roles that map to 'teacher'
  'Teacher': 'teacher',
  'Science Teacher': 'teacher',
  'Math Teacher': 'teacher',
  'English Teacher': 'teacher',
  'Arabic Teacher': 'teacher',
  'Islamic Studies Teacher': 'teacher',
  'PE Teacher': 'teacher',
  'Art Teacher': 'teacher',
  'Music Teacher': 'teacher',
  'Social Studies Teacher': 'teacher',

  // Staff roles that map to 'support_staff'
  'Librarian': 'support_staff',
  'Athletic Director': 'support_staff',
  'Administrative Assistant': 'support_staff',
  'Adminstrative Assistant': 'support_staff', // typo in data
  'Lab Assistant': 'support_staff',
  'Systems Administrator': 'support_staff',
  'Finance Admin': 'support_staff',
  'Registrar': 'support_staff',
  'PR': 'support_staff',
  'IT': 'support_staff',
  'HR': 'support_staff',
  'Facilities Director': 'support_staff',
  'Office Manager': 'support_staff',
  'Receptionist': 'support_staff',
}

// Default role if staff role not in mapping
const DEFAULT_ROLE = 'teacher'

// House mentors with their assigned houses
const HOUSE_MENTORS: Record<string, string> = {
  'hanan.dabaja@bhaprep.org': 'House of ʿUmar',
  'msolis@bhaprep.org': 'House of Khadījah',
  'nora.hamed@bhaprep.org': 'House of ʿĀʾishah',
  'fauzan.plasticwala@bhaprep.org': 'House of Abū Bakr',
}

// Admins (already created, skip these)
const ADMINS = [
  'moneeb.sarmad@bhaprep.org',
  'leila.kayed@bhaprep.org',
  'smoussa@bhaprep.org',
  'bayanne.elkhatib@bhaprep.org',
  'sonya.badr@bhaprep.org',
  'einas.alabd@bhaprep.org',
]

// Generate temporary password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password + '!'
}

interface StaffMember {
  staff_name: string
  email: string
  role: string
}

interface CreatedAccount {
  email: string
  password: string
  role: string
  assigned_house: string | null
  status: 'created' | 'skipped' | 'error'
  error?: string
}

async function main() {
  console.log('🚀 League of Stars - Staff Account Setup')
  console.log('=========================================\n')

  // Step 1: Fetch all staff members
  console.log('📋 Fetching staff members from database...')
  const { data: staffMembers, error: staffError } = await supabase
    .from('staff')
    .select('staff_name, email, role')
    .order('staff_name')

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError.message)
    process.exit(1)
  }

  console.log(`   Found ${staffMembers.length} staff members\n`)

  // Step 2: Check existing auth users (with pagination)
  console.log('🔍 Checking for existing auth accounts...')
  let allAuthUsers: { id: string; email?: string }[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
      process.exit(1)
    }

    allAuthUsers = [...allAuthUsers, ...authData.users]

    if (authData.users.length < perPage) break
    page++
  }

  const existingEmails = new Set(allAuthUsers.map(u => u.email?.toLowerCase()))
  console.log(`   Found ${existingEmails.size} existing auth accounts\n`)

  // Step 3: Check existing profiles
  console.log('🔍 Checking for existing profiles...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('email, role')

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
    process.exit(1)
  }

  const existingProfiles = new Set(profiles?.map(p => p.email?.toLowerCase()) || [])
  console.log(`   Found ${existingProfiles.size} existing profiles\n`)

  // Step 4: Process each staff member
  console.log('👥 Processing staff accounts...\n')
  const results: CreatedAccount[] = []
  let created = 0
  let skipped = 0
  let errors = 0

  for (const staff of staffMembers as StaffMember[]) {
    const email = staff.email.toLowerCase()
    const staffName = staff.staff_name

    // Skip admins (already set up)
    if (ADMINS.includes(email)) {
      console.log(`⏭️  ${staffName} (${email}) - Skipping (admin already configured)`)
      results.push({
        email,
        password: '',
        role: 'admin',
        assigned_house: null,
        status: 'skipped'
      })
      skipped++
      continue
    }

    // Determine role and house
    let rbacRole: string
    let assignedHouse: string | null = null

    if (HOUSE_MENTORS[email]) {
      rbacRole = 'house_mentor'
      assignedHouse = HOUSE_MENTORS[email]
    } else {
      rbacRole = ROLE_MAPPING[staff.role] || DEFAULT_ROLE
    }

    // Check if auth account exists
    const hasAuthAccount = existingEmails.has(email)
    const hasProfile = existingProfiles.has(email)

    if (hasAuthAccount && hasProfile) {
      console.log(`⏭️  ${staffName} (${email}) - Skipping (already exists)`)
      results.push({
        email,
        password: '',
        role: rbacRole,
        assigned_house: assignedHouse,
        status: 'skipped'
      })
      skipped++
      continue
    }

    const password = generatePassword()

    try {
      // Create auth account if needed
      let userId: string

      if (!hasAuthAccount) {
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: staffName
          }
        })

        if (createError) {
          throw new Error(`Auth creation failed: ${createError.message}`)
        }

        userId = authUser.user.id
        console.log(`✅ Created auth account for ${staffName} (${email})`)
      } else {
        // Get existing user ID
        const existingUser = allAuthUsers.find(u => u.email?.toLowerCase() === email)
        if (!existingUser) {
          throw new Error('Could not find existing user ID')
        }
        userId = existingUser.id
        console.log(`📌 Using existing auth account for ${staffName} (${email})`)
      }

      // Create profile if needed
      if (!hasProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            role: rbacRole,
            assigned_house: assignedHouse
          })

        if (profileError) {
          throw new Error(`Profile creation failed: ${profileError.message}`)
        }
        console.log(`   📝 Created profile with role: ${rbacRole}${assignedHouse ? ` (${assignedHouse})` : ''}`)
      } else {
        // Update existing profile with role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: rbacRole,
            assigned_house: assignedHouse
          })
          .eq('email', email)

        if (updateError) {
          throw new Error(`Profile update failed: ${updateError.message}`)
        }
        console.log(`   📝 Updated profile with role: ${rbacRole}${assignedHouse ? ` (${assignedHouse})` : ''}`)
      }

      results.push({
        email,
        password: hasAuthAccount ? '(existing account)' : password,
        role: rbacRole,
        assigned_house: assignedHouse,
        status: 'created'
      })
      created++

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.log(`❌ Error for ${staffName} (${email}): ${errorMessage}`)
      results.push({
        email,
        password: '',
        role: rbacRole,
        assigned_house: assignedHouse,
        status: 'error',
        error: errorMessage
      })
      errors++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Step 5: Summary
  console.log('\n=========================================')
  console.log('📊 SUMMARY')
  console.log('=========================================')
  console.log(`✅ Created: ${created}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`📋 Total processed: ${staffMembers.length}`)

  // Step 6: Output credentials for new accounts
  const newAccounts = results.filter(r => r.status === 'created' && r.password !== '(existing account)')

  if (newAccounts.length > 0) {
    console.log('\n=========================================')
    console.log('🔑 NEW ACCOUNT CREDENTIALS')
    console.log('=========================================')
    console.log('IMPORTANT: Share these credentials securely with each staff member.\n')

    for (const account of newAccounts) {
      console.log(`Email: ${account.email}`)
      console.log(`Password: ${account.password}`)
      console.log(`Role: ${account.role}${account.assigned_house ? ` (${account.assigned_house})` : ''}`)
      console.log('---')
    }

    // Also save to file
    const credentialsFile = `/Users/MoneebSarmad_1/Desktop/los_suite/scripts/credentials-${Date.now()}.txt`
    const credentialsContent = newAccounts.map(a =>
      `Email: ${a.email}\nPassword: ${a.password}\nRole: ${a.role}${a.assigned_house ? ` (${a.assigned_house})` : ''}\n`
    ).join('\n---\n\n')

    const fs = await import('fs')
    fs.writeFileSync(credentialsFile, credentialsContent)
    console.log(`\n📄 Credentials saved to: ${credentialsFile}`)
    console.log('   ⚠️  DELETE THIS FILE after distributing credentials!')
  }

  // Step 7: Show errors if any
  const errorAccounts = results.filter(r => r.status === 'error')
  if (errorAccounts.length > 0) {
    console.log('\n=========================================')
    console.log('⚠️  ACCOUNTS WITH ERRORS')
    console.log('=========================================')
    for (const account of errorAccounts) {
      console.log(`${account.email}: ${account.error}`)
    }
  }

  console.log('\n✨ Setup complete!')
}

main().catch(console.error)
