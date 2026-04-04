export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          phone: string | null
          skills: string[]
          experience: string | null
          education: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          phone?: string | null
          skills?: string[]
          experience?: string | null
          education?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          skills?: string[]
          experience?: string | null
          education?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          company: string
          title: string
          description: string
          requirements: string[]
          location: string
          type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Remote'
          domain: 'Technology' | 'Data Science' | 'Finance' | 'Healthcare' | 'Marketing' | 'Environment'
          salary_range: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company: string
          title: string
          description: string
          requirements?: string[]
          location: string
          type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Remote'
          domain: 'Technology' | 'Data Science' | 'Finance' | 'Healthcare' | 'Marketing' | 'Environment'
          salary_range?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company?: string
          title?: string
          description?: string
          requirements?: string[]
          location?: string
          type?: 'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Remote'
          domain?: 'Technology' | 'Data Science' | 'Finance' | 'Healthcare' | 'Marketing' | 'Environment'
          salary_range?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      interested_jobs: {
        Row: {
          id: string
          user_id: string
          job_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          credentials: string | null
          resume_url: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          credentials?: string | null
          resume_url?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          credentials?: string | null
          resume_url?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          application_id: string
          user_id: string
          started_at: string
          completed_at: string | null
          transcript: Json
          status: 'in_progress' | 'completed' | 'abandoned'
          score: number | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          user_id: string
          started_at?: string
          completed_at?: string | null
          transcript?: Json
          status?: 'in_progress' | 'completed' | 'abandoned'
          score?: number | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          user_id?: string
          started_at?: string
          completed_at?: string | null
          transcript?: Json
          status?: 'in_progress' | 'completed' | 'abandoned'
          score?: number | null
          feedback?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'application' | 'interview'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'application' | 'interview'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'application' | 'interview'
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type InterestedJob = Database['public']['Tables']['interested_jobs']['Row']
export type Application = Database['public']['Tables']['applications']['Row']
export type Interview = Database['public']['Tables']['interviews']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Join types for common queries
export type ApplicationWithJob = Application & {
  job: Job
}

export type InterestedJobWithDetails = InterestedJob & {
  job: Job
}
