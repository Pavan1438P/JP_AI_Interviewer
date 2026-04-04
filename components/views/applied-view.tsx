"use client"

import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { FileText, Calendar, Clock, MapPin, Play, CheckCircle } from "lucide-react"

export function AppliedView() {
  const { appliedInterviews, startInterview, setCurrentView } = useApp()

  if (appliedInterviews.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Applied Interviews</h1>
        <Empty>
          <EmptyMedia>
            <FileText className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>There is nothing in Applied Interviews</EmptyTitle>
          <EmptyDescription>
            Apply to jobs to see them here. Start exploring opportunities on the home page.
          </EmptyDescription>
          <EmptyContent>
            <Button onClick={() => setCurrentView("home")}>
              Browse Jobs
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Applied Interviews</h1>
        <Badge variant="secondary" className="text-sm">
          {appliedInterviews.length} Application{appliedInterviews.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-4">
        {appliedInterviews.map((application) => (
          <Card
            key={application.id}
            className="bg-gradient-to-br from-card to-accent/5 border-border/50"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{application.job.title}</CardTitle>
                  <p className="text-sm text-primary font-medium">{application.job.company}</p>
                </div>
                <Badge
                  variant={application.status === "completed" ? "default" : "secondary"}
                  className={
                    application.status === "completed"
                      ? "bg-green-500/20 text-green-700 border-green-500/30"
                      : "bg-primary/20 text-primary border-primary/30"
                  }
                >
                  {application.status === "completed" ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Completed
                    </>
                  ) : (
                    "Pending"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {application.job.description}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {application.scheduledDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {application.scheduledTime}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              {application.status === "pending" && (
                <Button
                  onClick={() => startInterview(application)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Take Interview
                </Button>
              )}
              {application.status === "completed" && (
                <p className="text-sm text-muted-foreground">
                  Interview completed. Results will be shared soon.
                </p>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setCurrentView("home")}
        className="w-full"
      >
        Back to Home
      </Button>
    </div>
  )
}
