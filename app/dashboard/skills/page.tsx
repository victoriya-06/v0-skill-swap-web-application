import { createClient } from "@/lib/supabase/server"
import { SkillsManager } from "@/components/dashboard/skills-manager"

export default async function SkillsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user's teach skills
  const { data: teachSkills } = await supabase
    .from("teach_skills")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  // Fetch user's learn skills
  const { data: learnSkills } = await supabase
    .from("learn_skills")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Skills</h1>
        <p className="text-muted-foreground">Manage skills you can teach and want to learn.</p>
      </div>
      <SkillsManager teachSkills={teachSkills || []} learnSkills={learnSkills || []} userId={user!.id} />
    </div>
  )
}
