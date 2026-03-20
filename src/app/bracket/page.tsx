export const dynamic = 'force-dynamic';

import { getTournamentBracket, getActiveTournament } from '@/lib/actions';
import { BracketView } from '@/components/bracket-view';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoundName } from '@/lib/bracket';

export default async function BracketPage() {
  const tournament = await getActiveTournament();

  if (!tournament) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
        <div className="text-center">
          <div className="mb-4 text-6xl">🏆</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">No Tournament in Progress</h1>
          <p className="text-muted-foreground">
            Check back soon when the next Mishna Madness tournament begins.
          </p>
        </div>
      </main>
    );
  }

  const bracketData = await getTournamentBracket(tournament.id);

  if (!bracketData) {
    return (
      <main className="flex min-h-screen flex-col bg-background px-4 py-6">
        <BracketSkeleton />
      </main>
    );
  }

  const totalRounds = bracketData.rounds.length;

  const rounds = bracketData.rounds.map((round) => ({
    id: round.id,
    round_number: round.round_number,
    status: round.status,
    special_seder: round.special_seder,
    matchups: round.matchups.map((m) => ({
      id: m.id,
      matchup_number: m.matchup_number,
      participant_1: m.participant1 ? { id: m.participant1.id, name: m.participant1.name } : null,
      participant_2: m.participant2 ? { id: m.participant2.id, name: m.participant2.name } : null,
      special_masechta: m.special_masechta,
      winner_id: m.winner_id,
      p1_total_score: m.p1_total_score,
      p2_total_score: m.p2_total_score,
    })),
  }));

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-4 py-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground md:text-2xl">
                {tournament.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {tournament.status === 'active'
                  ? `Round ${tournament.current_round}: ${getRoundName(tournament.current_round, totalRounds)}`
                  : 'Registration Open'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tournament.status === 'active'
                    ? 'bg-[color:var(--active)]/15 text-[color:var(--active)]'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {tournament.status === 'active' ? 'Live' : 'Registration'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <BracketView rounds={rounds} totalRounds={totalRounds} />
      </div>
    </main>
  );
}

function BracketSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-md" />
        ))}
      </div>
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
