"use client"

import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, User, FileText, Heart, Bell, HelpCircle, LogOut, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

export function Header() {
  const { isLoggedIn, logout, setCurrentView, notifications } = useApp()
  const router = useRouter()

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView("home")}
            className="flex items-center gap-2 text-[36px] font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            Haveloc
          </button>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Get an Interview Opportunity
          </span>
        </div>

        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative bg-gradient-to-r from-muted to-muted/80 hover:from-muted/90 hover:to-muted/70"
              >
                <Menu className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-gradient-to-b from-card to-muted/30"
            >
              <DropdownMenuItem
                onClick={() => setCurrentView("profile")}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCurrentView("applied")}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Applied Interviews
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCurrentView("interested")}
                className="cursor-pointer"
              >
                <Heart className="mr-2 h-4 w-4" />
                Interested Interviews
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCurrentView("notifications")}
                className="cursor-pointer"
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCurrentView("help")}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => router.push('/auth/login')} className="bg-primary hover:bg-primary/90">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </header>
  )
}
