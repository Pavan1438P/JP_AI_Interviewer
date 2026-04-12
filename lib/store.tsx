"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export interface JobListing {
  id: string
  company: string
  title: string
  description: string
  domain: string
  requirements: string[]
  location: string
  type: string
  created_at?: string
}

export interface Application {
  id: string
  jobId: string
  job: JobListing
  resume: string | null
  credentials: string
  scheduledDate: string
  scheduledTime: string
  status: "pending" | "completed" | "cancelled"
  created_at?: string
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  skills: string[]
  experience: string
  education: string
}

interface Notification {
  id: string
  title: string
  message: string
  date: string
  read: boolean
  created_at?: string
}

interface AppState {
  user: User | null
  isLoggedIn: boolean
  appliedInterviews: Application[]
  interestedInterviews: JobListing[]
  notifications: Notification[]
  currentView: "home" | "profile" | "applied" | "interested" | "notifications" | "help" | "apply" | "interview"
  selectedJob: JobListing | null
  currentApplication: Application | null
  logoutMessage: string | null
  isLoading: boolean
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signup: (email: string, password: string, userData: Partial<User>) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setCurrentView: (view: AppState["currentView"]) => void
  addInterested: (job: JobListing) => Promise<void>
  removeInterested: (jobId: string) => Promise<void>
  applyToJob: (job: JobListing) => void
  submitApplication: (data: { resume: string | null; credentials: string; scheduledDate: string; scheduledTime: string }) => Promise<void>
  setSelectedJob: (job: JobListing | null) => void
  startInterview: (application: Application) => void
  completeInterview: (applicationId: string, messages?: { role: string; content: string }[]) => Promise<void>
  updateUser: (user: Partial<User>) => Promise<void>
  clearLogoutMessage: () => void
  markNotificationAsRead: (notificationId: string) => Promise<void>
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [state, setState] = useState<AppState>({
    user: null,
    isLoggedIn: false,
    appliedInterviews: [],
    interestedInterviews: [],
    notifications: [],
    currentView: "home",
    selectedJob: null,
    currentApplication: null,
    logoutMessage: null,
    isLoading: true,
  })

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserData(session.user)
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
    initAuth()
  }, [])

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadUserData(session.user)
      } else if (event === "SIGNED_OUT") {
        setState(prev => ({
          ...prev,
          user: null,
          isLoggedIn: false,
          appliedInterviews: [],
          interestedInterviews: [],
          notifications: [],
          isLoading: false,
        }))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      console.log("Loading user data for:", supabaseUser.id, supabaseUser.email)
      
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()

      if (profileError) {
        console.error("Error loading profile:", profileError)
      }
      
      console.log("Profile loaded:", profile)

      // If no profile exists, create one from auth user data
      if (!profile) {
        console.log("No profile found, creating from auth data...")
        const userMetadata = supabaseUser.user_metadata
        const newProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: userMetadata?.name || supabaseUser.email?.split('@')[0] || "",
          phone: userMetadata?.phone || "",
          skills: userMetadata?.skills || [],
          experience: userMetadata?.experience || "",
          education: userMetadata?.education || "",
        }
        
        const { error: insertError } = await supabase.from("user_profiles").insert(newProfile)
        if (insertError) {
          console.error("Error creating profile:", insertError)
        } else {
          console.log("Profile created successfully")
          // Use the new profile
          setState(prev => ({
            ...prev,
            isLoggedIn: true,
            isLoading: false,
            user: mapUserFromSupabase(newProfile),
            currentView: "home",
          }))
          return
        }
      }

      // Load applications with job details
      const { data: applications } = await supabase
        .from("applications")
        .select(`*, job_listings (*)`)
        .eq("user_id", supabaseUser.id)
        .order("created_at", { ascending: false })

      // Load interested jobs
      const { data: interested } = await supabase
        .from("interested_jobs")
        .select(`job_listings (*)`)
        .eq("user_id", supabaseUser.id)

      // Load notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .order("created_at", { ascending: false })

      setState(prev => ({
        ...prev,
        isLoggedIn: true,
        isLoading: false,
        user: profile ? mapUserFromSupabase(profile) : null,
        appliedInterviews: (applications || []).map(mapApplicationFromSupabase),
        interestedInterviews: (interested || []).map((i: any) => mapJobFromSupabase(i.job_listings)),
        notifications: (notifications || []).map(mapNotificationFromSupabase),
        currentView: "home",
      }))
    } catch (error) {
      console.error("Error loading user data:", error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const refreshData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadUserData(session.user)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Create fresh client to avoid any persistent state issues
      const freshClient = createClient()
      const { error } = await freshClient.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: String(error.message || "Login failed") }
      }
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      return { error: String(message) }
    }
  }

  const signup = async (email: string, password: string, userData: Partial<User>) => {
    try {
      // Create fresh client to avoid any persistent state issues
      const freshClient = createClient()
      const { error, data } = await freshClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            skills: userData.skills,
            experience: userData.experience,
            education: userData.education,
          },
        },
      })

      if (error) {
        return { error: String(error.message || "Signup failed") }
      }

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { 
          error: "Check your email to confirm your account before logging in." 
        }
      }

      // Create user profile after signup
      if (data.user) {
        await freshClient.from("user_profiles").insert({
          id: data.user.id,
          email,
          name: userData.name,
          phone: userData.phone,
          skills: userData.skills || [],
          experience: userData.experience,
          education: userData.education,
        })
      }

      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      return { error: String(message) }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setState(prev => ({
      ...prev,
      isLoggedIn: false,
      currentView: "home",
      logoutMessage: "Successfully logged out",
    }))
  }

  const clearLogoutMessage = () => {
    setState(prev => ({ ...prev, logoutMessage: null }))
  }

  const setCurrentView = (view: AppState["currentView"]) => {
    setState(prev => ({ ...prev, currentView: view }))
  }

  const addInterested = async (job: JobListing) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase.from("interested_jobs").insert({
      user_id: session.user.id,
      job_id: job.id,
    })

    if (error) {
      console.error("Error adding interested job:", error.message)
      return
    }

    await refreshData()

    // Add notification
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      title: "Added to Interested",
      message: `You marked ${job.title} at ${job.company} as interested.`,
    })
  }

  const removeInterested = async (jobId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase
      .from("interested_jobs")
      .delete()
      .eq("user_id", session.user.id)
      .eq("job_id", jobId)

    await refreshData()
  }

  const applyToJob = (job: JobListing) => {
    setState(prev => ({
      ...prev,
      selectedJob: job,
      currentView: "apply",
    }))
  }

  const submitApplication = async (data: { resume: string | null; credentials: string; scheduledDate: string; scheduledTime: string }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user || !state.selectedJob) return

    const { error } = await supabase.from("applications").insert({
      user_id: session.user.id,
      job_id: state.selectedJob.id,
      resume_url: data.resume,
      credentials: data.credentials,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      status: "pending",
    })

    if (error) {
      console.error("Error submitting application:", error.message)
      return
    }

    // Add notification
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      title: "Application Submitted",
      message: `Your application for ${state.selectedJob.title} at ${state.selectedJob.company} has been submitted.`,
    })

    await refreshData()
    setState(prev => ({
      ...prev,
      selectedJob: null,
      currentView: "home",
    }))
  }

  const setSelectedJob = (job: JobListing | null) => {
    setState(prev => ({ ...prev, selectedJob: job }))
  }

  const startInterview = (application: Application) => {
    setState(prev => ({
      ...prev,
      currentApplication: application,
      currentView: "interview",
    }))
  }

  const completeInterview = async (applicationId: string, messages?: { role: string; content: string }[]) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase
      .from("applications")
      .update({ status: "completed" })
      .eq("id", applicationId)
      .eq("user_id", session.user.id)

    // Save interview messages to database for admin review
    if (messages && messages.length > 0) {
      const messagesToInsert = messages
        .filter(m => m.content && m.content !== "START_INTERVIEW_GREETING")
        .map(m => ({
          application_id: applicationId,
          role: m.role,
          content: m.content,
        }))
      if (messagesToInsert.length > 0) {
        await supabase.from("interview_messages").insert(messagesToInsert)
      }
    }

    // Add notification
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      title: "Interview Completed",
      message: "Your interview has been completed successfully.",
    })

    await refreshData()
    setState(prev => ({
      ...prev,
      currentApplication: null,
      currentView: "home",
    }))
  }

  const updateUser = async (userData: Partial<User>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase
      .from("user_profiles")
      .update({
        name: userData.name,
        phone: userData.phone,
        skills: userData.skills,
        experience: userData.experience,
        education: userData.education,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)

    await refreshData()
  }

  const markNotificationAsRead = async (notificationId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", session.user.id)

    await refreshData()
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        setCurrentView,
        addInterested,
        removeInterested,
        applyToJob,
        submitApplication,
        setSelectedJob,
        startInterview,
        completeInterview,
        updateUser,
        clearLogoutMessage,
        markNotificationAsRead,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// Helper functions to map Supabase data to app types
function mapJobFromSupabase(data: any): JobListing {
  return {
    id: data.id,
    company: data.company,
    title: data.title,
    description: data.description,
    domain: data.domain,
    requirements: data.requirements || [],
    location: data.location,
    type: data.type,
    created_at: data.created_at,
  }
}

function mapUserFromSupabase(data: any): User {
  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    skills: data.skills || [],
    experience: data.experience || "",
    education: data.education || "",
  }
}

function mapApplicationFromSupabase(data: any): Application {
  return {
    id: data.id,
    jobId: data.job_id,
    job: data.job_listings ? mapJobFromSupabase(data.job_listings) : {} as JobListing,
    resume: data.resume_url,
    credentials: data.credentials || "",
    scheduledDate: data.scheduled_date || "",
    scheduledTime: data.scheduled_time || "",
    status: data.status,
    created_at: data.created_at,
  }
}

function mapNotificationFromSupabase(data: any): Notification {
  return {
    id: data.id,
    title: data.title,
    message: data.message,
    date: data.created_at || new Date().toISOString(),
    read: data.read || false,
    created_at: data.created_at,
  }
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
