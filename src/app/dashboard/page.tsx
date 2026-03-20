'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getActiveTournament,
  getParticipantMatchup,
  getParticipantSubmissions,
  getRounds,
  getTournamentBracket,
} from '@/lib/actions';
import { getRoundName } from '@/lib/bracket';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tournament, Round, Matchup, Participant, ScoreSubmission } from '@/lib/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticipantInfo {
  id: string;
  name: string;
}

interface RoundMatchupData {
  round: Round;
  matchup: Matchup & {
    participant1: Participant | null;
    participant2: Participant | null;
    opponent: Participant | null;
  };
  mySubmissions: ScoreSubmission[];
  myScore: number;
  opponentScore: number;
  isWinner: boolean | null;
}

// ---------------------------------------------------------------------------
// Score bar comparison
// ---------------------------------------------------------------------------

function ScoreBar({
  myScore,
  opponentScore,
  myName,
  opponentName,
}: {
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
}) {
  const total = myScore + opponentScore;
  const myPct = total === 0 ? 50 : Math.round((myScore / total) * 100);
  const opPct = 100 - myPct;
  const leading = myScore > opponentScore ? 'me' : myScore < opponentScore ? 'opponent' : 'tied';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end gap-2">
        <div className="text-center flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate mb-0.5">{myName}</p>
          <p
            className={`text-3xl font-bold tabular-nums ${
              leading === 'me' ? 'text-primary' : 'text-foreground'
            }`}
          >
            {myScore.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>

        <div className="text-center pb-1">
          <span className="text-sm font-semibold text-muted-foreground">vs</span>
        </div>

        <div className="text-center flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate mb-0.5">{opponentName}</p>
          <p
            className={`text-3xl font-bold tabular-nums ${
              leading === 'opponent' ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {opponentScore.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="h-3 w-full rounded-full overflow-hidden bg-muted flex">
        <div
          className={`h-full transition-all duration-500 rounded-l-full ${
            leading === 'me' ? 'bg-primary' : leading === 'tied' ? 'bg-primary/60' : 'bg-primary/40'
          }`}
          style={{ width: `${myPct}%` }}
        />
        <div
          className={`h-full transition-all duration-500 rounded-r-full ${
            leading === 'opponent' ? 'bg-destructive' : leading === 'tied' ? 'bg-destructive/60' : 'bg-destructive/40'
          }`}
          style={{ width: `${opPct}%` }}
        />
      </div>

      {leading !== 'tied' && (
        <p className="text-center text-xs text-muted-foreground">
          {leading === 'me' ? (
            <span className="text-primary font-medium">You are leading</span>
          ) : (
            <span className="text-destructive font-medium">Opponent is leading</span>
          )}{' '}
          by {Math.abs(myScore - opponentScore).toLocaleString()} pts
        </p>
      )}
      {leading === 'tied' && (
        <p className="text-center text-xs font-medium text-muted-foreground">Tied</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Past round collapsible card
// ---------------------------------------------------------------------------

function PastRoundCard({
  data,
  participantId,
  totalRounds,
}: {
  data: RoundMatchupData;
  participantId: string;
  totalRounds: number;
}) {
  const [open, setOpen] = useState(false);
  const { round, matchup, mySubmissions, myScore, opponentScore, isWinner } = data;
  const roundName = getRoundName(round.round_number, totalRounds);

  return (
    <Card className="border-border">
      <button
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">
                Round {round.round_number}: {roundName}
              </CardTitle>
              <CardDescription className="text-sm mt-0.5 truncate">
                vs. {matchup.opponent?.name ?? 'Bye'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isWinner === true && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  Won
                </Badge>
              )}
              {isWinner === false && (
                <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30">
                  Lost
                </Badge>
              )}
              {isWinner === null && (
                <Badge variant="secondary">Bye</Badge>
              )}
              <span className="text-muted-foreground text-sm">{open ? '▲' : '▼'}</span>
            </div>
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4">
          <Separator />

          {/* Final score summary */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Your score</p>
              <p className="font-bold text-lg tabular-nums">{myScore.toLocaleString()}</p>
            </div>
            {matchup.opponent && (
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Opponent score</p>
                <p className="font-bold text-lg tabular-nums">{opponentScore.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Multiplier badges */}
          <div className="flex gap-2 flex-wrap">
            {round.special_seder && (
              <Badge variant="secondary" className="text-xs">
                Special Seder: {round.special_seder} (2x)
              </Badge>
            )}
            {matchup.special_masechta && (
              <Badge variant="secondary" className="text-xs">
                Special Masechta: {matchup.special_masechta} (3x)
              </Badge>
            )}
          </div>

          {/* Submissions list */}
          {mySubmissions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your submissions
              </p>
              <div className="space-y-1.5">
                {mySubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium truncate">{sub.masechta}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {sub.mishnayos_count} mishnayos
                      </span>
                      {sub.is_special_masechta && (
                        <Badge className="ml-1.5 text-[10px] px-1 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30">
                          3x
                        </Badge>
                      )}
                      {sub.is_special_seder && (
                        <Badge className="ml-1 text-[10px] px-1 py-0 bg-sky-500/15 text-sky-600 border-sky-500/30">
                          2x
                        </Badge>
                      )}
                      {sub.is_late && (
                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-muted-foreground">
                          Late
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold tabular-nums ml-2 shrink-0">
                      +{sub.multiplied_points.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No submissions recorded.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6 max-w-2xl mx-auto w-full">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();

  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentMatchupData, setCurrentMatchupData] = useState<{
    matchup: Matchup & {
      participant1: Participant | null;
      participant2: Participant | null;
      opponent: Participant | null;
    };
    submissions: ScoreSubmission[];
  } | null>(null);
  const [pastRoundsData, setPastRoundsData] = useState<RoundMatchupData[]>([]);
  const [isEliminated, setIsEliminated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('participant_id');
    const storedName = localStorage.getItem('participant_name');

    if (!storedId || !storedName) {
      router.replace('/login');
      return;
    }

    setParticipant({ id: storedId, name: storedName });

    const load = async () => {
      try {
        const t = await getActiveTournament();
        if (!t) {
          setLoading(false);
          return;
        }
        setTournament(t);

        const allRounds = await getRounds(t.id);
        setRounds(allRounds);

        const totalRounds = allRounds.length;
        const currentRoundNumber = t.current_round;
        const currentRound = allRounds.find((r) => r.round_number === currentRoundNumber);

        // Fetch matchup for current round
        if (currentRound) {
          const matchupResult = await getParticipantMatchup(storedId, currentRound.id);
          if (matchupResult) {
            setCurrentMatchupData(matchupResult);
            // Determine if participant is in this matchup; if not, they may be eliminated
            const inMatchup =
              matchupResult.matchup.participant_1_id === storedId ||
              matchupResult.matchup.participant_2_id === storedId;
            if (!inMatchup) {
              setIsEliminated(true);
            }
          } else {
            // No matchup found in current round = eliminated
            setIsEliminated(true);
          }
        }

        // Fetch past rounds data
        const pastRounds = allRounds.filter((r) => r.round_number < currentRoundNumber && r.status === 'completed');
        const pastData: RoundMatchupData[] = [];

        for (const r of pastRounds) {
          const result = await getParticipantMatchup(storedId, r.id);
          if (!result) continue;

          const { matchup, submissions } = result;
          const isP1 = matchup.participant_1_id === storedId;
          const myScore = isP1 ? matchup.p1_total_score : matchup.p2_total_score;
          const opponentScore = isP1 ? matchup.p2_total_score : matchup.p1_total_score;

          let isWinner: boolean | null = null;
          if (matchup.winner_id === storedId) {
            isWinner = true;
          } else if (matchup.winner_id && matchup.winner_id !== storedId) {
            isWinner = false;
          } else if (!matchup.participant_2_id || !matchup.participant_1_id) {
            isWinner = null; // bye
          }

          const mySubmissions = await getParticipantSubmissions(matchup.id, storedId);

          pastData.push({
            round: r,
            matchup,
            mySubmissions,
            myScore,
            opponentScore,
            isWinner,
          });
        }

        setPastRoundsData(pastData.reverse());
      } catch (err) {
        console.error('[DashboardPage] load error', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="min-h-[48px]">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!participant) return null;

  if (!tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold">Welcome, {participant.name}!</p>
          <p className="text-muted-foreground text-sm">
            No active tournament right now. Check back soon.
          </p>
          <Button render={<Link href="/" />} variant="outline" className="min-h-[48px]">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const totalRounds = rounds.length;
  const currentRoundNumber = tournament.current_round;
  const currentRound = rounds.find((r) => r.round_number === currentRoundNumber);
  const roundName = currentRound ? getRoundName(currentRound.round_number, totalRounds) : '';

  // Compute aggregate stats across all rounds
  const allPastSubmissionCounts = pastRoundsData.reduce((acc, d) => {
    return acc + d.mySubmissions.reduce((s, sub) => s + sub.mishnayos_count, 0);
  }, 0);
  const currentRoundSubmissions = currentMatchupData?.submissions.filter(
    (s) => s.participant_id === participant.id
  ) ?? [];
  const currentRoundMishnayos = currentRoundSubmissions.reduce(
    (s, sub) => s + sub.mishnayos_count,
    0
  );
  const totalMishnayos = allPastSubmissionCounts + currentRoundMishnayos;

  const allPastPoints = pastRoundsData.reduce((acc, d) => acc + d.myScore, 0);
  const isP1Current =
    currentMatchupData?.matchup.participant_1_id === participant.id;
  const currentPoints = currentMatchupData
    ? isP1Current
      ? currentMatchupData.matchup.p1_total_score
      : currentMatchupData.matchup.p2_total_score
    : 0;
  const totalPoints = allPastPoints + currentPoints;

  const currentOpponentScore = currentMatchupData
    ? isP1Current
      ? currentMatchupData.matchup.p2_total_score
      : currentMatchupData.matchup.p1_total_score
    : 0;

  const deadlineFormatted = currentRound
    ? new Date(currentRound.end_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Elimination round info
  const eliminatedInRound = isEliminated
    ? pastRoundsData.find((d) => d.isWinner === false)?.round.round_number
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Welcome back, {participant.name}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tournament.name}
          </p>
        </div>

        {/* Eliminated banner */}
        {isEliminated && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Eliminated</Badge>
                {eliminatedInRound != null && (
                  <span className="text-sm text-muted-foreground">
                    in Round {eliminatedInRound}:{' '}
                    {getRoundName(eliminatedInRound, totalRounds)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You can still view the bracket and cheer on the remaining participants!
              </p>
              <Button render={<Link href="/bracket" />} variant="outline" size="lg" className="min-h-[48px] w-full mt-1">
                View Full Bracket
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current matchup hero card */}
        {!isEliminated && currentMatchupData && currentRound && (
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold">
                  Round {currentRound.round_number}: {roundName}
                </CardTitle>
                <Badge className="bg-[color:var(--active)]/15 text-[color:var(--active)] border-[color:var(--active)]/30 shrink-0">
                  Active
                </Badge>
              </div>
              {currentMatchupData.matchup.opponent && (
                <CardDescription className="text-sm mt-0.5">
                  vs. {currentMatchupData.matchup.opponent.name}
                </CardDescription>
              )}
              {!currentMatchupData.matchup.opponent && (
                <CardDescription className="text-sm mt-0.5">Bye round</CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Score comparison */}
              {currentMatchupData.matchup.opponent ? (
                <ScoreBar
                  myScore={currentPoints}
                  opponentScore={currentOpponentScore}
                  myName={participant.name}
                  opponentName={currentMatchupData.matchup.opponent.name}
                />
              ) : (
                <div className="text-center py-2">
                  <p className="text-3xl font-bold tabular-nums text-primary">
                    {currentPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">your points</p>
                </div>
              )}

              {/* Multiplier badges */}
              <div className="flex gap-2 flex-wrap">
                {currentMatchupData.matchup.special_masechta && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs gap-1">
                    <span>Special Masechta:</span>
                    <span className="font-bold">{currentMatchupData.matchup.special_masechta}</span>
                    <span>(3x)</span>
                  </Badge>
                )}
                {currentRound.special_seder && (
                  <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30 text-xs gap-1">
                    <span>Special Seder:</span>
                    <span className="font-bold">{currentRound.special_seder}</span>
                    <span>(2x)</span>
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Submit button */}
              <Button
                render={<Link href="/submit" />}
                size="lg"
                className="w-full min-h-[56px] text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Submit Scores
              </Button>

              {/* Deadline */}
              {deadlineFormatted && (
                <p className="text-center text-sm text-muted-foreground">
                  Scores due by{' '}
                  <span className="font-medium text-foreground">{deadlineFormatted}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* No current matchup and not eliminated */}
        {!isEliminated && !currentMatchupData && currentRound && (
          <Card className="border-border">
            <CardContent className="py-8 text-center space-y-2">
              <p className="font-semibold text-foreground">No active matchup found</p>
              <p className="text-sm text-muted-foreground">
                Your Round {currentRound.round_number} matchup may not have been assigned yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="py-4 px-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {totalMishnayos.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Total Mishnayos
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="py-4 px-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {totalPoints.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Total Points
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="py-4 px-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {currentRoundNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                Current Round
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Past rounds */}
        {pastRoundsData.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Past Rounds</h2>
            {pastRoundsData.map((data) => (
              <PastRoundCard
                key={data.round.id}
                data={data}
                participantId={participant.id}
                totalRounds={totalRounds}
              />
            ))}
          </div>
        )}

        {/* View bracket link */}
        <div className="pt-2 pb-6">
          <Button
            render={<Link href="/bracket" />}
            variant="outline"
            size="lg"
            className="w-full min-h-[52px] text-base font-medium"
          >
            View Full Bracket
          </Button>
        </div>
      </div>
    </div>
  );
}
