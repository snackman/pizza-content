import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardClient>{children}</DashboardClient>
}
