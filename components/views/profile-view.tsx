"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { User, Mail, Phone, Briefcase, GraduationCap, Edit2, Save, X } from "lucide-react"

export function ProfileView() {
  const { user, updateUser, setCurrentView } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    skills: user?.skills.join(", ") || "",
    experience: user?.experience || "",
    education: user?.education || "",
  })

  const handleSave = () => {
    updateUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      experience: formData.experience,
      education: formData.education,
    })
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please login to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-gradient-to-br from-card to-accent/5 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-lg font-semibold"
                />
              ) : (
                <span className="text-xl font-semibold">{user.name}</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </FieldLabel>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
            </Field>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </FieldLabel>
              {isEditing ? (
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{user.phone}</p>
              )}
            </Field>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Skills
              </FieldLabel>
              {isEditing ? (
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Separate skills with commas"
                />
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Experience
              </FieldLabel>
              {isEditing ? (
                <Textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{user.experience}</p>
              )}
            </Field>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Education
              </FieldLabel>
              {isEditing ? (
                <Input
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{user.education}</p>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

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
