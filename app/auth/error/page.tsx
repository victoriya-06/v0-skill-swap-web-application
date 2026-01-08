import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Repeat, AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Repeat className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold">SkillSwap</span>
      </Link>
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {params?.error ? (
              <p className="mb-6 text-sm text-muted-foreground">Error: {params.error}</p>
            ) : (
              <p className="mb-6 text-sm text-muted-foreground">An unspecified error occurred.</p>
            )}
            <Button asChild className="w-full">
              <Link href="/auth/login">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
