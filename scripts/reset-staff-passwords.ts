/**
 * LEAGUE OF STARS - Reset Staff Passwords Script
 *
 * This script generates new passwords for all staff members and saves
 * the credentials to a file for distribution.
 *
 * Usage:
 * SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx reset-staff-passwords.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Configuration
const SUPABASE_URL = 'https://bvohvpwptmibveegccgf.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Admins to skip (they already have their passwords)
const SKIP_EMAILS = [
  'moneeb.sarmad@bhaprep.org',
  'leila.kayed@bhaprep.org',
  'smoussa@bhaprep.org',
  'bayanne.elkhatib@bhaprep.org',
  'sonya.badr@bhaprep.org',
  'einas.alabd@bhaprep.org',
]

// Generate a secure random password
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$'

  let password = ''
  // Ensure at least one of each type
  password += upper.charAt(Math.floor(Math.random() * upper.length))
  password += lower.charAt(Math.floor(Math.random() * lower.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += special.charAt(Math.floor(Math.random() * special.length))

  // Fill rest with mixed characters
  const allChars = upper + lower + numbers
  for (let i = 0; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

interface Credential {
  name: string
  email: string
  password: string
  role: string
  house?: string
}

async function main() {
  console.log('🔐 League of Stars - Password Reset Script')
  console.log('==========================================\n')

  // Step 1: Get all staff with their profiles
  console.log('📋 Fetching staff and profile data...')

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('staff_name, email, role')
    .order('staff_name')

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError.message)
    process.exit(1)
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role, assigned_house')

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
    process.exit(1)
  }

  // Create profile lookup by email
  const profileMap = new Map(profiles?.map(p => [p.email?.toLowerCase(), p]) || [])

  console.log(`   Found ${staff?.length} staff members\n`)

  // Step 2: Reset passwords for each staff member
  console.log('🔄 Resetting passwords...\n')

  const credentials: Credential[] = []
  let success = 0
  let skipped = 0
  let errors = 0

  for (const member of staff || []) {
    const email = member.email.toLowerCase()
    const name = member.staff_name

    // Skip admins
    if (SKIP_EMAILS.includes(email)) {
      console.log(`⏭️  ${name} - Skipping (admin)`)
      skipped++
      continue
    }

    const profile = profileMap.get(email)
    if (!profile) {
      console.log(`⚠️  ${name} - No profile found, skipping`)
      skipped++
      continue
    }

    const password = generatePassword()

    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password }
      )

      if (updateError) {
        throw new Error(updateError.message)
      }

      credentials.push({
        name,
        email,
        password,
        role: profile.role || 'unknown',
        house: profile.assigned_house || undefined
      })

      console.log(`✅ ${name} (${email})`)
      success++

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.log(`❌ ${name}: ${errorMessage}`)
      errors++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Step 3: Save credentials to file
  console.log('\n==========================================')
  console.log('📊 SUMMARY')
  console.log('==========================================')
  console.log(`✅ Reset: ${success}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)

  if (credentials.length > 0) {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `/Users/MoneebSarmad_1/Desktop/los_suite/scripts/staff-credentials-${timestamp}.txt`

    // Format credentials nicely
    let content = `LEAGUE OF STARS - STAFF LOGIN CREDENTIALS
Generated: ${new Date().toLocaleString()}
==========================================

IMPORTANT:
- Share these credentials securely with each staff member
- Staff can change their password after logging in
- DELETE THIS FILE after distributing credentials

==========================================

`

    // Group by role
    const byRole: Record<string, Credential[]> = {}
    for (const cred of credentials) {
      const role = cred.role
      if (!byRole[role]) byRole[role] = []
      byRole[role].push(cred)
    }

    const roleOrder = ['house_mentor', 'teacher', 'support_staff']

    for (const role of roleOrder) {
      if (byRole[role] && byRole[role].length > 0) {
        content += `\n${'='.repeat(50)}\n`
        content += `${role.toUpperCase().replace('_', ' ')}S (${byRole[role].length})\n`
        content += `${'='.repeat(50)}\n\n`

        for (const cred of byRole[role].sort((a, b) => a.name.localeCompare(b.name))) {
          content += `Name: ${cred.name}\n`
          content += `Email: ${cred.email}\n`
          content += `Password: ${cred.password}\n`
          if (cred.house) {
            content += `Assigned House: ${cred.house}\n`
          }
          content += `\n---\n\n`
        }
      }
    }

    fs.writeFileSync(filename, content)
    console.log(`\n📄 Credentials saved to:\n   ${filename}`)
    console.log('\n⚠️  IMPORTANT: Delete this file after distributing credentials!')
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
