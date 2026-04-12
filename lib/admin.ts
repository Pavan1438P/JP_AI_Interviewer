import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return null
  }

  return { user, profile }
}

export async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) {
    redirect("/")
  }
  return admin
}

export async function isAdminRequest(req: Request): Promise<{ isAdmin: boolean; userId: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { isAdmin: false, userId: null }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return {
    isAdmin: profile?.role === "admin",
    userId: user.id,
  }
}
