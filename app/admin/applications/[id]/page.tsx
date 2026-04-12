"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  Video,
  Star,
  User,
  Briefcase,
} from "lucide-react"

interface ApplicationDetail {
  id: string
  user_id: string
  job_id: string
  resume_url: string | null
  credentials: string
  scheduled_date: string
  scheduled_time: string
  status: string
  resume_score: number | null
  interview_score: number | null
  video_url: string | null
  admin_approved: boolean
  admin_notes: string | null
  created_at: string
  job_listings: {
    title: string
    company: string
    domain: string
    description: string
    requirements: string[]
  } | null
  user_profiles: {
    name: string
    email: string
    phone: string
    skills: string[]
    experience: string
    education: string
  } | null
}

interface InterviewMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [adminNotes, setAdminNotes] = useState("")
  const [approving, setApproving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const loadApplication = async () => {
    const { data } = await supabase
      .from("applications")
      .select(
        `*, job_listings (title, company, domain, description, requirements), user_profiles:user_id (name, email, phone, skills, experience, education)`
      )
      .eq("id", params.id)
      .single()

    if (data) {
      setApp(data as any)
      setAdminNotes(data.admin_notes || "")

      // Load interview messages
      const { data: msgs } = await supabase
        .from("interview_messages")
        .select("*")
        .eq("application_id", params.id)
        .order("created_at", { ascending: true })

      setMessages(msgs || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadApplication()
  }, [params.id])

  const handleApprove = async (approved: boolean) => {
    if (!app) return
    setApproving(true)

    // Update application
    const { error } = await supabase
      .from("applications")
      .update({
        admin_approved: approved,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id)

    if (error) {
      console.error("Error updating application:", error)
      setApproving(false)
      return
    }

    // Send notification to the user
    await supabase.from("notifications").insert({
      user_id: app.user_id,
      title: approved ? "Interview Approved!" : "Interview Update",
      message: approved
        ? `Congratulations! Your interview for ${app.job_listings?.title} at ${app.job_listings?.company} has been approved.${
            adminNotes.trim() ? ` Admin notes: ${adminNotes.trim()}` : ""
          }`
        : `Your application for ${app.job_listings?.title} at ${app.job_listings?.company} has been reviewed.${
            adminNotes.trim() ? ` Feedback: ${adminNotes.trim()}` : ""
          }`,
    })

    setApproving(false)
    await loadApplication()
  }

  const calculateScore = async () => {
    if (!app) return
    setCalculating(true)

    try {
      const res = await fetch(`/api/admin/applications/${app.id}/score`, {
        method: "POST",
      })
      if (res.ok) {
        await loadApplication()
      } else {
        console.error("Score calculation failed")
      }
    } catch (err) {
      console.error("Error calculating score:", err)
    }

    setCalculating(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading application...</div>
  }

  if (!app) {
    return <div className="text-center py-12 text-muted-foreground">Application not found.</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={() => router.push("/admin/applications")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Applications
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Application Review</h1>
          <p className="text-muted-foreground mt-1">
            {app.user_profiles?.name || "Unknown"} &mdash; {app.job_listings?.title} at {app.job_listings?.company}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              app.status === "completed" ? "default" : app.status === "cancelled" ? "destructive" : "secondary"
            }
          >
            {app.status}
          </Badge>
          {app.admin_approved && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{app.user_profiles?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{app.user_profiles?.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{app.user_profiles?.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Skills</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.user_profiles?.skills?.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                )) || <span className="text-sm">N/A</span>}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="text-sm">{app.user_profiles?.experience || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Education</p>
              <p className="text-sm">{app.user_profiles?.education || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credentials Submitted</p>
              <p className="text-sm">{app.credentials || "N/A"}</p>
            </div>
            {app.resume_url && (
              <div>
                <p className="text-sm text-muted-foreground">Resume</p>
                <a
                  href={app.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  View Resume
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{app.job_listings?.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{app.job_listings?.company}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Domain</p>
              <Badge variant="outline">{app.job_listings?.domain}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{app.job_listings?.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requirements</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {app.job_listings?.requirements?.map((req) => (
                  <Badge key={req} variant="secondary" className="text-xs">
                    {req}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-sm">
                {app.scheduled_date} at {app.scheduled_time}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            AI Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Resume Score</p>
              <div
                className={`text-3xl font-bold ${
                  app.resume_score !== null
                    ? app.resume_score >= 70
                      ? "text-green-500"
                      : app.resume_score >= 40
                      ? "text-yellow-500"
                      : "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {app.resume_score !== null ? `${app.resume_score}/100` : "N/A"}
              </div>
            </div>
            <Separator orientation="vertical" className="h-16" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Interview Score</p>
              <div
                className={`text-3xl font-bold ${
                  app.interview_score !== null
                    ? app.interview_score >= 70
                      ? "text-green-500"
                      : app.interview_score >= 40
                      ? "text-yellow-500"
                      : "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {app.interview_score !== null ? `${app.interview_score}/100` : "N/A"}
              </div>
            </div>
            <Separator orientation="vertical" className="h-16" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Overall</p>
              <div className="text-3xl font-bold text-foreground">
                {app.resume_score !== null && app.interview_score !== null
                  ? `${Math.round((app.resume_score + app.interview_score) / 2)}/100`
                  : "N/A"}
              </div>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                onClick={calculateScore}
                disabled={calculating || app.status !== "completed"}
              >
                {calculating ? "Calculating..." : "Calculate AI Score"}
              </Button>
              {app.status !== "completed" && (
                <p className="text-xs text-muted-foreground mt-1">Interview must be completed first</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Recording */}
      {app.video_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Interview Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <video controls className="w-full rounded-lg max-h-96" src={app.video_url}>
              Your browser does not support the video tag.
            </video>
          </CardContent>
        </Card>
      )}

      {/* Interview Chat Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Interview Chat Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "assistant" ? "bg-primary/10" : "bg-accent"
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {msg.role === "assistant" ? "AI" : "U"}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg p-3 max-w-[80%] ${
                      msg.role === "assistant"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              No interview transcript available. The interview may not have been conducted yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Admin Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes / Feedback</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about the candidate, interview performance, etc."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleApprove(true)}
              disabled={approving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {approving ? "Processing..." : "Approve Interview"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApprove(false)}
              disabled={approving}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {approving ? "Processing..." : "Reject"}
            </Button>
          </div>
          {app.admin_approved && app.reviewed_at && (
            <p className="text-sm text-muted-foreground">
              Last reviewed: {new Date(app.reviewed_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
