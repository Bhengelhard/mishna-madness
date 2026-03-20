export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getActiveTournament } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function StatusBadge({ status }: { status: 'registration' | 'active' | 'completed' }) {
  if (status === 'registration') {
    return (
      <Badge className="bg-primary/15 text-primary border-primary/30 text-sm px-3 py-1">
        Registration Open
      </Badge>
    );
  }
  if (status === 'active') {
    return (
      <Badge className="bg-[color:var(--active)]/15 text-[color:var(--active)] border-[color:var(--active)]/30 text-sm px-3 py-1">
        Tournament Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-sm px-3 py-1">
      Completed
    </Badge>
  );
}

export default async function HomePage() {
  const tournament = await getActiveTournament();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8">

          {/* Title block */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-5xl sm:text-6xl font-bold tracking-tight text-primary leading-none">
              <span>🏆</span>
              <h1>Mishna<br className="sm:hidden" /> Madness</h1>
              <span>📖</span>
            </div>
            <p className="text-muted-foreground text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
              A 64-participant Torah learning tournament. Learn Mishnayos, earn points, advance through the bracket!
            </p>
          </div>

          {/* Tournament card */}
          {tournament ? (
            <Card className="w-full shadow-md border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {tournament.name}
                  </CardTitle>
                  <StatusBadge status={tournament.status} />
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {tournament.status === 'registration' && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Registration closes{' '}
                      <span className="font-medium text-foreground">
                        {new Date(tournament.registration_deadline).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      . Secure your spot now!
                    </p>
                    <Button render={<Link href="/register" />} size="lg" className="w-full min-h-[48px] text-base font-semibold">
                      Register Now
                    </Button>
                    <Button render={<Link href="/bracket" />} variant="outline" size="lg" className="w-full min-h-[44px]">
                      View Bracket
                    </Button>
                  </>
                )}

                {tournament.status === 'active' && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Round {tournament.current_round} is underway. Submit your learning scores and check the bracket.
                    </p>
                    <Button render={<Link href="/bracket" />} size="lg" className="w-full min-h-[48px] text-base font-semibold">
                      View Bracket
                    </Button>
                    <Button render={<Link href="/dashboard" />} variant="outline" size="lg" className="w-full min-h-[44px]">
                      Submit Scores
                    </Button>
                  </>
                )}

                {tournament.status === 'completed' && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      The tournament has concluded. See the final results below.
                    </p>
                    <Button render={<Link href="/bracket" />} size="lg" className="w-full min-h-[44px]">
                      View Final Bracket
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full shadow-md border-primary/20">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">📅</span>
                <p className="text-lg font-semibold text-foreground">Coming Soon</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  No active tournament right now. Check back soon for the next Mishna Madness!
                </p>
              </CardContent>
            </Card>
          )}

          {/* How it works */}
          <div className="w-full grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '📚', label: 'Learn Mishnayos' },
              { icon: '⭐', label: 'Earn Points' },
              { icon: '🏆', label: 'Win the Bracket' },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-card rounded-lg border border-border p-3 flex flex-col items-center gap-1.5">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Sign in link */}
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <Link href="/login" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-border text-center">
        <Link
          href="/admin"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
