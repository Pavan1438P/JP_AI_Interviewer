"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Bot,
  User,
  Send,
  Briefcase,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function InterviewView() {
  const { currentApplication, completeInterview, setCurrentView, user } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasCompletedInterview = useRef(false)

  // Store context
  const contextRef = useRef({
    jobTitle: currentApplication?.job.title || "",
    jobDescription: currentApplication?.job.description || "",
    jobRequirements: currentApplication?.job.requirements || [],
    company: currentApplication?.job.company || "",
    candidateCredentials: currentApplication?.credentials || "",
    candidateName: user?.name || "",
    candidateEmail: user?.email || "",
  })

  // Update context when data changes
  useEffect(() => {
    if (currentApplication && user) {
      contextRef.current = {
        jobTitle: currentApplication.job.title,
        jobDescription: currentApplication.job.description,
        jobRequirements: currentApplication.job.requirements,
        company: currentApplication.job.company,
        candidateCredentials: currentApplication.credentials,
        candidateName: user.name,
        candidateEmail: user.email,
      }
    }
  }, [currentApplication, user])

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input after response
  useEffect(() => {
    if (!isLoading && !isCompleted) {
      inputRef.current?.focus()
    }
  }, [isLoading, isCompleted])

  // Check for interview completion
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && !hasCompletedInterview.current) {
      const text = lastMessage.content.toLowerCase()
      if (text.includes("[interview_complete]") || text.includes("interview is now complete")) {
        setIsCompleted(true)
        hasCompletedInterview.current = true
        // Automatically complete the interview when AI indicates completion
        if (currentApplication) {
          completeInterview(currentApplication.id)
        }
      }
    }
  }, [messages, currentApplication, completeInterview])

  // Send message to API
  const sendToAPI = useCallback(async (userText: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Build messages array for API
      const apiMessages = messages.map(m => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text", text: m.content }],
      }))

      // Add new user message
      apiMessages.push({
        id: Date.now().toString(),
        role: "user",
        parts: [{ type: "text", text: userText }],
      })

      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-interview-context": JSON.stringify(contextRef.current),
        },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Read streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      let assistantMessage = ""
      const messageId = (Date.now() + 1).toString()

      // Add empty assistant message that we'll fill
      setMessages(prev => [...prev, { id: messageId, role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "text-delta" && parsed.delta) {
                assistantMessage += parsed.delta
                setMessages(prev =>
                  prev.map(m =>
                    m.id === messageId ? { ...m, content: assistantMessage } : m
                  )
                )
              }
            } catch {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }

      reader.releaseLock()
    } catch (err: any) {
      console.error("Interview API error:", err)
      setError(err.message || "Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  // Start interview automatically
  useEffect(() => {
    if (messages.length === 0 && currentApplication && !hasStarted.current) {
      hasStarted.current = true
      setTimeout(() => {
        sendToAPI("START_INTERVIEW_GREETING")
      }, 500)
    }
  }, [currentApplication, messages.length, sendToAPI])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isCompleted) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages(prev => [...prev, userMsg])
    sendToAPI(input)
    setInput("")
  }

  const handleComplete = () => {
    setCurrentView("home")
  }

  if (!currentApplication) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No interview selected.</p>
        <Button onClick={() => setCurrentView("applied")} className="mt-4">
          View Applications
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="text-center py-4 border-b border-border bg-gradient-to-r from-primary/5 via-background to-secondary/5 shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Interview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentApplication.job.title} at {currentApplication.job.company}
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Job Details & Credentials */}
        <div className="hidden lg:flex w-80 flex-col border-r border-border bg-muted/30 p-4 gap-4 overflow-y-auto">
          <Card className="bg-card shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {currentApplication.job.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {currentApplication.job.requirements.map((req) => (
                  <Badge key={req} variant="outline" className="text-[10px]">
                    {req}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Your Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {currentApplication.credentials}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                    <Spinner className="h-5 w-5" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-card border border-destructive/50 text-foreground">
                    <p className="text-sm">Error: {error}. Please try again.</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <Separator />

          {/* Input Area */}
          <div className="p-4 bg-background shrink-0">
            {isCompleted ? (
              <div className="max-w-2xl mx-auto">
                <Card className="bg-gradient-to-br from-green-500/10 to-primary/10 border-green-500/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Interview Completed Successfully</p>
                        <p className="text-sm text-muted-foreground">
                          Your interview has been marked as completed. Thank you for your time!
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                      Return to Home
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isLoading ? "AI is thinking..." : "Type your answer..."}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Job Info */}
      <div className="lg:hidden border-t border-border p-3 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>Tip: Answer questions based on your experience and the job requirements.</span>
        </div>
      </div>
    </div>
  )
}
