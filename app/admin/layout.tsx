import { requireAdmin } from "@/lib/admin"
import Link from "next/link"
import { LayoutDashboard, Briefcase, FileText, LogOut } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdmin()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border p-4 flex flex-col">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-foreground">Haveloc Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {profile.name || profile.email}
            </p>
          </div>

          <nav className="flex-1 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/jobs"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Briefcase className="h-4 w-4" />
              Manage Jobs
            </Link>
            <Link
              href="/admin/applications"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4" />
              Applications
            </Link>
          </nav>

          <div className="border-t border-border pt-4">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
