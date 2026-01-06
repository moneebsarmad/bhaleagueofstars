/**
 * Setup admin accounts with passwords and display names
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabase = createClient(
  'https://bvohvpwptmibveegccgf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin info with display names
const ADMINS = [
  { email: 'moneeb.sarmad@bhaprep.org', name: 'Moneeb Sarmad', needsPassword: false },
  { email: 'bayanne.elkhatib@bhaprep.org', name: 'Bayanne Elkhatib', needsPassword: false },
  { email: 'leila.kayed@bhaprep.org', name: 'Leila Kayed', needsPassword: true },
  { email: 'smoussa@bhaprep.org', name: 'Sami Moussa', needsPassword: true },
  { email: 'einas.alabd@bhaprep.org', name: 'Einas Alabd', needsPassword: true },
  { email: 'sonya.badr@bhaprep.org', name: 'Sonya Badr', needsPassword: true },
  { email: 'sundus.khan@bhaprep.org', name: 'Sundus Khan', needsPassword: true, setProfileRole: true },
]

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$'

  let password = ''
  password += upper.charAt(Math.floor(Math.random() * upper.length))
  password += lower.charAt(Math.floor(Math.random() * lower.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += special.charAt(Math.floor(Math.random() * special.length))

  const allChars = upper + lower + numbers
  for (let i = 0; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function main() {
  console.log('🔐 Setting up Admin Accounts')
  console.log('============================\n')

  // Get all auth users with pagination
  let allUsers: { id: string; email?: string }[] = []
  let page = 1
  while (true) {
    const { data: authData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!authData?.users.length) break
    allUsers = [...allUsers, ...authData.users]
    if (authData.users.length < 1000) break
    page++
  }

  console.log(`Found ${allUsers.length} total auth users\n`)

  // Debug: show admin emails in auth
  const adminEmails = ADMINS.map(a => a.email.toLowerCase())
  const foundAdmins = allUsers.filter(u => adminEmails.includes(u.email?.toLowerCase() || ''))
  console.log('Admin accounts found in auth:')
  foundAdmins.forEach(u => console.log(`  - ${u.email} (${u.id})`))
  console.log('')

  const credentials: { email: string; password: string; name: string }[] = []

  for (const admin of ADMINS) {
    console.log(`Processing ${admin.name} (${admin.email})...`)

    // Get user ID
    const user = allUsers.find(u => u.email?.toLowerCase() === admin.email.toLowerCase())

    if (!user) {
      if (!admin.needsPassword) {
        console.log(`  ❌ No auth account found for ${admin.email}`)
        continue
      }

      const password = generatePassword()
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: admin.name }
      })

      if (createError || !newUser?.user) {
        console.log(`  ❌ Failed to create auth account: ${createError?.message || 'Unknown error'}`)
        continue
      }

      console.log(`  ✅ Created auth account`)
      allUsers.push({ id: newUser.user.id, email: admin.email })
      credentials.push({ email: admin.email, password, name: admin.name })
      await supabase
        .from('admins')
        .upsert({
          auth_user_id: newUser.user.id,
          staff_name: admin.name,
          email: admin.email,
          is_super_admin: false
        }, { onConflict: 'auth_user_id' })
      console.log(`  ✅ Added to admins table`)
      if (admin.setProfileRole) {
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('email', admin.email)
        console.log(`  ✅ Profile role set to admin`)
      }
      console.log('')
      continue
    }

    await supabase
      .from('admins')
      .upsert({
        auth_user_id: user.id,
        staff_name: admin.name,
        email: admin.email,
        is_super_admin: false
      }, { onConflict: 'auth_user_id' })
    console.log(`  ✅ Added to admins table`)

    if (admin.setProfileRole) {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('email', admin.email)
      console.log(`  ✅ Profile role set to admin`)
    }

    // Update display name
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: admin.name }
    })

    if (updateError) {
      console.log(`  ❌ Failed to update display name: ${updateError.message}`)
    } else {
      console.log(`  ✅ Display name set to: ${admin.name}`)
    }

    // Set password if needed
    if (admin.needsPassword) {
      const password = generatePassword()
      const { error: pwError } = await supabase.auth.admin.updateUserById(user.id, {
        password
      })

      if (pwError) {
        console.log(`  ❌ Failed to set password: ${pwError.message}`)
      } else {
        console.log(`  ✅ Password set`)
        credentials.push({ email: admin.email, password, name: admin.name })
      }
    }

    console.log('')
  }

  // Save credentials
  if (credentials.length > 0) {
    console.log('============================')
    console.log('🔑 ADMIN CREDENTIALS')
    console.log('============================\n')

    let content = `ADMIN CREDENTIALS\nGenerated: ${new Date().toLocaleString()}\n\n`

    for (const cred of credentials) {
      console.log(`Name: ${cred.name}`)
      console.log(`Email: ${cred.email}`)
      console.log(`Password: ${cred.password}`)
      console.log('---')

      content += `Name: ${cred.name}\nEmail: ${cred.email}\nPassword: ${cred.password}\n\n---\n\n`
    }

    const filename = `/Users/MoneebSarmad_1/Desktop/los_suite/scripts/admin-credentials.txt`
    fs.writeFileSync(filename, content)
    console.log(`\n📄 Saved to: ${filename}`)
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
