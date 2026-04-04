"use client"

import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Bell } from "lucide-react"

export function NotificationsView() {
  const { notifications, setCurrentView } = useApp()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Notifications</h1>
        <Empty>
          <EmptyMedia>
            <Bell className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>There is nothing in Notifications</EmptyTitle>
          <EmptyDescription>
            You will receive notifications when you apply to jobs or get updates on your applications.
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Notifications</h1>

      <div className="space-y-3">
        {notifications
          .slice()
          .reverse()
          .map((notification) => (
            <Card
              key={notification.id}
              className={`bg-gradient-to-br from-card to-accent/5 border-border/50 ${
                !notification.read ? "border-l-4 border-l-primary" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{notification.title}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {formatDate(notification.date)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </CardContent>
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
