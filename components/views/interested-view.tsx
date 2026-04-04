"use client"

import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { JobCard } from "@/components/job-card"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Heart } from "lucide-react"

export function InterestedView() {
  const { interestedInterviews, setCurrentView } = useApp()

  if (interestedInterviews.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Interested Interviews</h1>
        <Empty>
          <EmptyMedia>
            <Heart className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>There is nothing in Interested Interviews</EmptyTitle>
          <EmptyDescription>
            Mark jobs as interested to save them here for later. Browse jobs on the home page.
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
        <h1 className="text-2xl font-bold text-foreground">Interested Interviews</h1>
        <Badge variant="secondary" className="text-sm">
          {interestedInterviews.length} Saved
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {interestedInterviews.map((job) => (
          <JobCard key={job.id} job={job} />
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
