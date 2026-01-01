import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bvohvpwptmibveegccgf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Find Fauzan in staff table
  const { data: allStaff } = await supabase
    .from('staff')
    .select('staff_name, email')
    .ilike('email', '%fauzan%')

  console.log('Staff matching fauzan:', allStaff)

  // Also search by name
  const { data: byName } = await supabase
    .from('staff')
    .select('staff_name, email')
    .ilike('staff_name', '%fauzan%')

  console.log('Staff matching name Fauzan:', byName)
}

main().catch(console.error)
