import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, Repeat, Video, MessageCircle, Shield, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Repeat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">SkillSwap</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                100% Free Skill Exchange
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-6xl">
                Learn Something New. <span className="text-primary">Teach What You Know.</span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground text-pretty md:text-xl">
                SkillSwap connects people who want to exchange skills directly with each other. No money involved — just
                mutual learning and growth.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild className="gap-2">
                  <Link href="/auth/sign-up">
                    Start Swapping Skills
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">How SkillSwap Works</h2>
              <p className="text-muted-foreground">
                Three simple steps to start exchanging skills with people around the world.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "List Your Skills",
                  description:
                    "Add skills you can teach and skills you want to learn. Set your experience level for each.",
                },
                {
                  step: "02",
                  title: "Get Matched",
                  description:
                    "Our system finds users who want to learn what you teach and can teach what you want to learn.",
                },
                {
                  step: "03",
                  title: "Start Learning",
                  description: "Connect via chat or video call. Schedule sessions and exchange knowledge directly.",
                },
              ].map((item) => (
                <Card key={item.step} className="relative overflow-hidden border-0 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <span className="mb-4 block text-5xl font-bold text-primary/20">{item.step}</span>
                    <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Everything You Need to Exchange Skills</h2>
              <p className="text-muted-foreground">
                Built for seamless skill sharing with all the tools for effective learning.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Repeat,
                  title: "Smart Matching",
                  description:
                    "Our algorithm finds perfect skill exchange partners based on what you teach and want to learn.",
                },
                {
                  icon: MessageCircle,
                  title: "Real-time Chat",
                  description: "Message your matches directly to discuss learning goals and coordinate sessions.",
                },
                {
                  icon: Video,
                  title: "Video Calls",
                  description: "Jump into live video sessions for hands-on teaching and interactive learning.",
                },
                {
                  icon: Users,
                  title: "Community Driven",
                  description: "Join a community of learners and teachers helping each other grow.",
                },
                {
                  icon: Shield,
                  title: "Trust & Safety",
                  description: "Rate sessions, report issues, and connect safely with verified community members.",
                },
                {
                  icon: Sparkles,
                  title: "Always Free",
                  description: "No fees, no premium tiers. SkillSwap is and will always be completely free.",
                },
              ].map((feature) => (
                <Card key={feature.title} className="border bg-card/50">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-primary py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-primary-foreground">Ready to Start Learning?</h2>
              <p className="mb-8 text-primary-foreground/80">
                Join thousands of people exchanging skills every day. Sign up for free and find your perfect skill swap
                partner.
              </p>
              <Button size="lg" variant="secondary" asChild className="gap-2">
                <Link href="/auth/sign-up">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Repeat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">SkillSwap</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for the community. Always free.</p>
        </div>
      </footer>
    </div>
  )
}
