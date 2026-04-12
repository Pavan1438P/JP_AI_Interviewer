import { requireAdmin } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, FileText, Users, CheckCircle2 } from "lucide-react"

export default async function AdminDashboard() {
  await requireAdmin()
  const supabase = await createClient()

  // Fetch stats
  const [
    { count: totalJobs },
    { count: totalApplications },
    { count: pendingApplications },
    { count: approvedApplications },
    { count: completedInterviews },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from("job_listings").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("admin_approved", true),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
  ])

  // Recent applications
  const { data: recentApps } = await supabase
    .from("applications")
    .select(`*, job_listings (title, company), user_profiles:user_id (name, email)`)
    .order("created_at", { ascending: false })
    .limit(5)

  const stats = [
    { label: "Total Jobs", value: totalJobs || 0, icon: Briefcase, color: "text-blue-500" },
    { label: "Total Applications", value: totalApplications || 0, icon: FileText, color: "text-purple-500" },
    { label: "Pending Review", value: pendingApplications || 0, icon: FileText, color: "text-yellow-500" },
    { label: "Completed Interviews", value: completedInterviews || 0, icon: CheckCircle2, color: "text-green-500" },
    { label: "Approved", value: approvedApplications || 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Total Users", value: totalUsers || 0, icon: Users, color: "text-indigo-500" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your AI Interview platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {recentApps && recentApps.length > 0 ? (
            <div className="space-y-3">
              {recentApps.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {app.user_profiles?.name || app.user_profiles?.email || "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Applied for {app.job_listings?.title} at {app.job_listings?.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        app.status === "completed"
                          ? "bg-green-500/10 text-green-600"
                          : app.status === "cancelled"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      {app.status}
                    </span>
                    {app.admin_approved && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                        Approved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No applications yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
