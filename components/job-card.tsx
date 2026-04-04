"use client"

import { JobListing, useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Briefcase, Heart, HeartOff } from "lucide-react"

interface JobCardProps {
  job: JobListing
}

export function JobCard({ job }: JobCardProps) {
  const { addInterested, removeInterested, applyToJob, interestedInterviews, isLoggedIn } = useApp()

  const isInterested = interestedInterviews.some((j) => j.id === job.id)

  const handleInterested = () => {
    if (isInterested) {
      removeInterested(job.id)
    } else {
      addInterested(job)
    }
  }

  return (
    <Card className="w-full bg-gradient-to-br from-card via-card to-accent/5 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              {job.title}
            </CardTitle>
            <p className="text-sm font-medium text-primary mt-1">{job.company}</p>
          </div>
          <Badge
            variant="secondary"
            className={
              `bg-secondary/20 ${job.type === "Full-time" || job.type === "Internship" ? "text-black" : "text-secondary-foreground"} border-secondary/30`
            }
          >
            {job.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.requirements.slice(0, 4).map((req) => (
            <Badge
              key={req}
              variant="outline"
              className="text-xs bg-muted/50 border-border/50"
            >
              {req}
            </Badge>
          ))}
          {job.requirements.length > 4 && (
            <Badge variant="outline" className="text-xs bg-muted/50 border-border/50">
              +{job.requirements.length - 4} more
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {job.domain}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleInterested}
          disabled={!isLoggedIn}
          className={
            isInterested
              ? "bg-secondary/20 border-secondary text-secondary hover:bg-secondary/30"
              : "hover:bg-secondary/10 hover:border-secondary/50"
          }
        >
          {isInterested ? (
            <>
              <HeartOff className="mr-1.5 h-4 w-4" />
              Remove
            </>
          ) : (
            <>
              <Heart className="mr-1.5 h-4 w-4" />
              Interested
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={() => applyToJob(job)}
          disabled={!isLoggedIn}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Apply
        </Button>
      </CardFooter>
    </Card>
  )
}
