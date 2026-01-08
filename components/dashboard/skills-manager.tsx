"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X, GraduationCap, BookOpen } from "lucide-react"
import type { TeachSkill, LearnSkill, SkillLevel } from "@/lib/types"

interface SkillsManagerProps {
  teachSkills: TeachSkill[]
  learnSkills: LearnSkill[]
  userId: string
}

const skillLevelLabels: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

const skillLevelColors: Record<SkillLevel, string> = {
  beginner: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  intermediate: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  advanced: "bg-chart-3/10 text-chart-3 border-chart-3/30",
}

export function SkillsManager({ teachSkills, learnSkills, userId }: SkillsManagerProps) {
  const router = useRouter()

  return (
    <Tabs defaultValue="teach" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="teach" className="gap-2">
          <GraduationCap className="h-4 w-4" />
          Skills I Teach ({teachSkills.length})
        </TabsTrigger>
        <TabsTrigger value="learn" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Skills I Want ({learnSkills.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="teach">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Skills I Can Teach
              </CardTitle>
              <CardDescription>Skills you can share with others</CardDescription>
            </div>
            <AddSkillDialog type="teach" userId={userId} onSuccess={() => router.refresh()} />
          </CardHeader>
          <CardContent>
            {teachSkills.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No teaching skills yet"
                description="Add skills you can teach to start helping others and finding matches."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teachSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} type="teach" onDelete={() => router.refresh()} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="learn">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Skills I Want to Learn
              </CardTitle>
              <CardDescription>Skills you&apos;re looking to learn from others</CardDescription>
            </div>
            <AddSkillDialog type="learn" userId={userId} onSuccess={() => router.refresh()} />
          </CardHeader>
          <CardContent>
            {learnSkills.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No learning goals yet"
                description="Add skills you want to learn to find people who can teach you."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {learnSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} type="learn" onDelete={() => router.refresh()} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SkillCard({
  skill,
  type,
  onDelete,
}: {
  skill: TeachSkill | LearnSkill
  type: "teach" | "learn"
  onDelete: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    const table = type === "teach" ? "teach_skills" : "learn_skills"

    await supabase.from(table).delete().eq("id", skill.id)
    onDelete()
  }

  return (
    <div className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Delete skill</span>
      </Button>
      <div className="pr-8">
        <h4 className="font-medium">{skill.skill_name}</h4>
        <Badge variant="outline" className={`mt-2 ${skillLevelColors[skill.level]}`}>
          {skillLevelLabels[skill.level]}
        </Badge>
        {"description" in skill && skill.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
        )}
      </div>
    </div>
  )
}

function AddSkillDialog({
  type,
  userId,
  onSuccess,
}: {
  type: "teach" | "learn"
  userId: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [skillName, setSkillName] = useState("")
  const [level, setLevel] = useState<SkillLevel>("beginner")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const table = type === "teach" ? "teach_skills" : "learn_skills"

    const data: { user_id: string; skill_name: string; level: SkillLevel; description?: string } = {
      user_id: userId,
      skill_name: skillName.trim(),
      level,
    }

    if (type === "teach" && description.trim()) {
      data.description = description.trim()
    }

    const { error: insertError } = await supabase.from(table).insert(data)

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You've already added this skill")
      } else {
        setError(insertError.message)
      }
      setIsLoading(false)
      return
    }

    setSkillName("")
    setLevel("beginner")
    setDescription("")
    setOpen(false)
    setIsLoading(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a {type === "teach" ? "Teaching" : "Learning"} Skill</DialogTitle>
          <DialogDescription>
            {type === "teach" ? "Add a skill you can teach to others." : "Add a skill you want to learn from others."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skillName">Skill Name</Label>
            <Input
              id="skillName"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., Guitar, Python, Spanish"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">{type === "teach" ? "Your Experience Level" : "Desired Level"}</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as SkillLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "teach" && (
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What can you teach about this skill?"
                rows={3}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Skill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
