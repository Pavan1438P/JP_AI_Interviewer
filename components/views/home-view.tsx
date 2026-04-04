"use client"

import { useState } from "react"
import { JobCard } from "@/components/job-card"
import { jobListings, domains } from "@/lib/jobs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function HomeView() {
  const [selectedDomain, setSelectedDomain] = useState("All Domains")

  const filteredJobs =
    selectedDomain === "All Domains"
      ? jobListings
      : jobListings.filter((job) => job.domain === selectedDomain)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
          Available Job and Internship Interview Opportunities
          <span className="block text-primary">across various domains</span>
        </h1>
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-muted-foreground">
          Select a specific domain if you want
        </span>
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue placeholder="Select domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No jobs found in this domain. Try selecting a different domain.
          </p>
        </div>
      )}
    </div>
  )
}
