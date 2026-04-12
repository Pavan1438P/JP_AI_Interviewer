"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Search } from "lucide-react"
import Link from "next/link"

interface ApplicationRow {
  id: string
  status: string
  resume_url: string | null
  resume_score: number | null
  interview_score: number | null
  admin_approved: boolean
  created_at: string
  job_listings: { title: string; company: string; domain: string } | null
  user_profiles: { name: string; email: string } | null
}

export default function AdminApplicationsPage() {
  const supabase = createClient()
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadApplications = async () => {
    let query = supabase
      .from("applications")
      .select(`*, job_listings (title, company, domain), user_profiles:user_id (name, email)`)
      .order("created_at", { ascending: false })

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data } = await query
    setApplications((data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadApplications()
  }, [statusFilter])

  const filtered = applications.filter((app) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      app.user_profiles?.name?.toLowerCase().includes(s) ||
      app.user_profiles?.email?.toLowerCase().includes(s) ||
      app.job_listings?.title?.toLowerCase().includes(s) ||
      app.job_listings?.company?.toLowerCase().includes(s)
    )
  })

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading applications...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Applications</h1>
        <p className="text-muted-foreground mt-1">Review candidate applications, scores, and approve interviews</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, job..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No applications found.
            </CardContent>
          </Card>
        ) : (
          filtered.map((app) => (
            <Card key={app.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {app.user_profiles?.name || app.user_profiles?.email || "Unknown"}
                      </h3>
                      <Badge
                        variant={
                          app.status === "completed"
                            ? "default"
                            : app.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {app.status}
                      </Badge>
                      {app.admin_approved && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {app.job_listings?.title} at {app.job_listings?.company}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      {app.resume_score !== null && (
                        <span className="text-xs text-muted-foreground">
                          Resume Score: <span className="font-semibold text-foreground">{app.resume_score}/100</span>
                        </span>
                      )}
                      {app.interview_score !== null && (
                        <span className="text-xs text-muted-foreground">
                          Interview Score: <span className="font-semibold text-foreground">{app.interview_score}/100</span>
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Applied: {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link href={`/admin/applications/${app.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
