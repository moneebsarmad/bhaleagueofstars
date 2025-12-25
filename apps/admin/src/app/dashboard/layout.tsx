import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import AnnouncementsPopup from '@/components/AnnouncementsPopup'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Tables } from '@/lib/supabase/tables'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    redirect('/')
  }

  const { data: admin } = await supabase
    .from(Tables.admins)
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()

  if (!admin) {
    redirect('/')
  }

  const adminName = admin?.staff_name || authData.user.email || 'Admin'

  return (
    <div className="min-h-screen bg-[#faf9f7] pattern-overlay">
      <Sidebar />
      <AnnouncementsPopup />

      {/* Main Content */}
      <div className="ml-72">
        {/* Header */}
        <DashboardHeader adminName={adminName} />

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
