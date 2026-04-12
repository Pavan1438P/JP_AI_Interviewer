"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface Job {
  id: string
  company: string
  title: string
  description: string
  domain: string
  requirements: string[]
  location: string
  type: string
  created_at: string
}

const DOMAINS = ["Technology", "Data Science", "Finance", "Healthcare", "Marketing", "Environment", "Education", "Other"]
const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"]

export default function AdminJobsPage() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [form, setForm] = useState({
    company: "",
    title: "",
    description: "",
    domain: "Technology",
    requirements: "",
    location: "",
    type: "Full-time",
  })
  const [submitting, setSubmitting] = useState(false)

  const loadJobs = async () => {
    const { data } = await supabase
      .from("job_listings")
      .select("*")
      .order("created_at", { ascending: false })
    setJobs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const resetForm = () => {
    setForm({
      company: "",
      title: "",
      description: "",
      domain: "Technology",
      requirements: "",
      location: "",
      type: "Full-time",
    })
    setEditingJob(null)
  }

  const openEdit = (job: Job) => {
    setEditingJob(job)
    setForm({
      company: job.company,
      title: job.title,
      description: job.description,
      domain: job.domain,
      requirements: job.requirements.join(", "),
      location: job.location,
      type: job.type,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const jobData = {
      company: form.company.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      domain: form.domain,
      requirements: form.requirements.split(",").map((r) => r.trim()).filter(Boolean),
      location: form.location.trim(),
      type: form.type,
    }

    if (editingJob) {
      const { error } = await supabase
        .from("job_listings")
        .update(jobData)
        .eq("id", editingJob.id)
      if (error) {
        console.error("Error updating job:", error)
      }
    } else {
      const { error } = await supabase
        .from("job_listings")
        .insert(jobData)
      if (error) {
        console.error("Error creating job:", error)
      }
    }

    setSubmitting(false)
    setDialogOpen(false)
    resetForm()
    await loadJobs()
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job listing?")) return
    await supabase.from("job_listings").delete().eq("id", jobId)
    await loadJobs()
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">Add, edit, and manage interview job listings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Job" : "Add New Job"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Frontend Developer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  required
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="e.g. TechCorp Solutions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Job description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Select value={form.domain} onValueChange={(v) => setForm((f) => ({ ...f, domain: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  required
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Remote, New York, NY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (comma-separated)</Label>
                <Input
                  id="requirements"
                  value={form.requirements}
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                  placeholder="e.g. React, TypeScript, Node.js"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No jobs yet. Click "Add Job" to create the first listing.
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      <Badge variant="secondary">{job.type}</Badge>
                      <Badge variant="outline">{job.domain}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.company} • {job.location}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    {job.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.requirements.map((req) => (
                          <Badge key={req} variant="secondary" className="text-xs">{req}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(job)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
