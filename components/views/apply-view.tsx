"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { ArrowLeft, Upload, Calendar, Clock, Building2, MapPin, FileText } from "lucide-react"

export function ApplyView() {
  const { selectedJob, submitApplication, setCurrentView, user } = useApp()
  const [credentials, setCredentials] = useState(
    user
      ? `Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone}
Skills: ${user.skills.join(", ")}
Experience: ${user.experience}
Education: ${user.education}`
      : ""
  )
  const [resume, setResume] = useState<string | null>(null)
  const [resumeFileName, setResumeFileName] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFileName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        setResume(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentials || !scheduledDate || !scheduledTime || !resume) {
      alert("Please fill in all required fields, including your resume.")
      return
    }
    submitApplication({
      credentials,
      resume,
      scheduledDate,
      scheduledTime,
    })
  }

  if (!selectedJob) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No job selected. Please select a job to apply.</p>
        <Button onClick={() => setCurrentView("home")} className="mt-4">
          Browse Jobs
        </Button>
      </div>
    )
  }

  // Get tomorrow's date for minimum date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Apply for Position</h1>
      </div>

      {/* Job Details Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{selectedJob.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1 text-primary">
                <Building2 className="h-4 w-4" />
                {selectedJob.company}
              </CardDescription>
            </div>
            <Badge variant="secondary">{selectedJob.type}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{selectedJob.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedJob.requirements.map((req) => (
              <Badge key={req} variant="outline" className="bg-background">
                {req}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {selectedJob.location}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Application Form */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-gradient-to-br from-card to-accent/5 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Your Application</CardTitle>
            <CardDescription>
              Fill in your details and schedule your interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="space-y-6">
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Credentials / About You *
                </FieldLabel>
                <Textarea
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  placeholder="Enter your name, email, skills, experience, education, and any other relevant information..."
                  className="min-h-[200px]"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Resume/CV (PDF) *
                </FieldLabel>
                <p className="text-sm text-muted-foreground mb-2">
                  Resume upload is required to submit your application, but it will not be used during AI evaluation.
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("resume-upload")?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {resumeFileName || "Choose File"}
                  </Button>
                </div>
                {resumeFileName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {resumeFileName}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Interview Date *
                  </FieldLabel>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={minDate}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Interview Time *
                  </FieldLabel>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="flex gap-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentView("home")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!resume}
              >
                Submit Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
