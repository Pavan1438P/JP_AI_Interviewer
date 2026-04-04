"use client"

import { useApp } from "@/lib/store"
import { Header } from "@/components/header"
import { HomeView } from "@/components/views/home-view"
import { ProfileView } from "@/components/views/profile-view"
import { AppliedView } from "@/components/views/applied-view"
import { InterestedView } from "@/components/views/interested-view"
import { NotificationsView } from "@/components/views/notifications-view"
import { HelpView } from "@/components/views/help-view"
import { ApplyView } from "@/components/views/apply-view"
import { InterviewView } from "@/components/views/interview-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

function LogoutMessage() {
  const { logoutMessage, clearLogoutMessage } = useApp()
  const router = useRouter()

  if (!logoutMessage) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-to-br from-card to-accent/10 border-primary/20">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{logoutMessage}</h2>
          <p className="text-muted-foreground">
            Thank you for using Haveloc. We hope to see you again soon!
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={clearLogoutMessage}
              className="flex-1"
            >
              Close
            </Button>
            <Button onClick={() => router.push('/auth/login')} className="flex-1">
              <LogIn className="mr-2 h-4 w-4" />
              Login Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MainContent() {
  const { currentView, isLoggedIn } = useApp()

  // Interview view is fullscreen
  if (currentView === "interview") {
    return <InterviewView />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!isLoggedIn && currentView !== "home" ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Please login to access this feature.</p>
          </div>
        ) : (
          <>
            {currentView === "home" && <HomeView />}
            {currentView === "profile" && <ProfileView />}
            {currentView === "applied" && <AppliedView />}
            {currentView === "interested" && <InterestedView />}
            {currentView === "notifications" && <NotificationsView />}
            {currentView === "help" && <HelpView />}
            {currentView === "apply" && <ApplyView />}
          </>
        )}
      </main>
      <LogoutMessage />
    </div>
  )
}

export default function Page() {
  return <MainContent />
}
