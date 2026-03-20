'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getRoundName } from '@/lib/bracket';
import { cn } from '@/lib/utils';

interface BracketViewProps {
  rounds: Array<{
    id: string;
    round_number: number;
    status: string;
    special_seder: string | null;
    matchups: Array<{
      id: string;
      matchup_number: number;
      participant_1: { id: string; name: string } | null;
      participant_2: { id: string; name: string } | null;
      special_masechta: string;
      winner_id: string | null;
      p1_total_score: number;
      p2_total_score: number;
    }>;
  }>;
  totalRounds: number;
}

function getMatchupStatus(matchup: BracketViewProps['rounds'][0]['matchups'][0]): 'completed' | 'active' | 'upcoming' {
  if (matchup.winner_id) return 'completed';
  if (matchup.participant_1 && matchup.participant_2) return 'active';
  return 'upcoming';
}

function MatchupCard({
  matchup,
  compact = false,
}: {
  matchup: BracketViewProps['rounds'][0]['matchups'][0];
  compact?: boolean;
}) {
  const status = getMatchupStatus(matchup);
  const p1IsWinner = matchup.winner_id === matchup.participant_1?.id;
  const p2IsWinner = matchup.winner_id === matchup.participant_2?.id;

  const borderColor =
    status === 'completed'
      ? 'border-[color:var(--winner)]/50'
      : status === 'active'
      ? 'border-[color:var(--active)]/60'
      : 'border-border';

  const shadowColor =
    status === 'completed'
      ? 'shadow-[0_0_0_1px_oklch(0.55_0.18_145/0.15)]'
      : status === 'active'
      ? 'shadow-[0_0_0_1px_oklch(0.60_0.15_85/0.15)]'
      : '';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2 bg-card transition-all',
        borderColor,
        shadowColor,
        compact ? 'min-w-[200px]' : 'w-full'
      )}
    >
      {/* Active glow bar */}
      {status === 'active' && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--active)]" />
      )}
      {status === 'completed' && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--winner)]" />
      )}

      {/* Masechta badge */}
      <div className={cn('px-3 pt-2.5 pb-1', compact && 'px-2 pt-2')}>
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide',
            status === 'active' && 'bg-[color:var(--active)]/15 text-[color:var(--active)] border-[color:var(--active)]/20',
            status === 'completed' && 'bg-[color:var(--winner)]/15 text-[color:var(--winner)] border-[color:var(--winner)]/20'
          )}
        >
          {matchup.special_masechta}
        </Badge>
      </div>

      {/* Participant rows */}
      <div className={cn('flex flex-col divide-y divide-border', compact ? 'px-2 pb-2' : 'px-3 pb-3')}>
        <ParticipantRow
          name={matchup.participant_1?.name ?? null}
          score={matchup.p1_total_score}
          isWinner={p1IsWinner}
          isLoser={matchup.winner_id !== null && !p1IsWinner}
          status={status}
          compact={compact}
        />
        <ParticipantRow
          name={matchup.participant_2?.name ?? null}
          score={matchup.p2_total_score}
          isWinner={p2IsWinner}
          isLoser={matchup.winner_id !== null && !p2IsWinner}
          status={status}
          compact={compact}
        />
      </div>
    </div>
  );
}

function ParticipantRow({
  name,
  score,
  isWinner,
  isLoser,
  status,
  compact,
}: {
  name: string | null;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  status: 'completed' | 'active' | 'upcoming';
  compact: boolean;
}) {
  const displayName = name ?? (status === 'upcoming' ? 'TBD' : 'BYE');
  const isBye = !name && status !== 'upcoming';
  const isTbd = !name && status === 'upcoming';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 py-1.5 rounded transition-colors',
        isWinner && 'bg-[color:var(--winner)]/10',
        compact ? 'py-1' : 'py-1.5'
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {isWinner && (
          <span className="shrink-0 text-[10px] text-[color:var(--winner)]">&#9654;</span>
        )}
        <span
          className={cn(
            'truncate text-sm font-medium leading-tight',
            isWinner && 'text-[color:var(--winner)] font-semibold',
            isLoser && 'text-muted-foreground line-through',
            (isBye || isTbd) && 'italic text-muted-foreground font-normal',
            compact && 'text-xs'
          )}
        >
          {displayName}
        </span>
      </div>
      {!isBye && !isTbd && status !== 'upcoming' && (
        <span
          className={cn(
            'shrink-0 tabular-nums text-sm font-bold',
            isWinner ? 'text-[color:var(--winner)]' : 'text-muted-foreground',
            compact && 'text-xs'
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// -------------------------
// MOBILE LAYOUT
// -------------------------
function MobileBracket({ rounds, totalRounds }: BracketViewProps) {
  const activeRoundIndex = rounds.findIndex((r) => r.status === 'active');
  const defaultRound = activeRoundIndex >= 0 ? rounds[activeRoundIndex].id : rounds[0]?.id ?? '';
  const [selectedRound, setSelectedRound] = useState(defaultRound);

  return (
    <Tabs value={selectedRound} onValueChange={setSelectedRound} className="flex flex-col h-full">
      {/* Round tabs */}
      <div className="border-b border-border bg-card px-4 pb-0 pt-3">
        <TabsList
          variant="line"
          className="w-full overflow-x-auto flex justify-start gap-0 h-auto pb-0 rounded-none bg-transparent"
        >
          {rounds.map((round) => (
            <TabsTrigger
              key={round.id}
              value={round.id}
              className={cn(
                'shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium rounded-none border-b-2 border-transparent h-auto',
                'data-active:border-[color:var(--primary)] data-active:text-foreground data-active:after:hidden',
                round.status === 'active' && 'text-[color:var(--active)]'
              )}
            >
              <span>{getRoundName(round.round_number, totalRounds)}</span>
              {round.status === 'active' && (
                <span className="h-1 w-1 rounded-full bg-[color:var(--active)]" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Round content */}
      {rounds.map((round) => (
        <TabsContent
          key={round.id}
          value={round.id}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 mt-0"
        >
          {round.special_seder && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Special Seder:
              </span>
              <span className="text-xs font-medium text-foreground">{round.special_seder}</span>
            </div>
          )}
          {round.matchups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">No matchups yet for this round.</p>
            </div>
          ) : (
            round.matchups.map((matchup) => (
              <MatchupCard key={matchup.id} matchup={matchup} />
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// -------------------------
// DESKTOP BRACKET LAYOUT
// -------------------------

function DesktopBracket({ rounds, totalRounds }: BracketViewProps) {
  return (
    <div className="flex h-full overflow-x-auto px-6 py-6 gap-0 items-stretch">
      {rounds.map((round, roundIndex) => {
        const isLast = roundIndex === rounds.length - 1;
        const matchupCount = round.matchups.length;

        return (
          <div
            key={round.id}
            className="flex flex-col shrink-0"
            style={{ minWidth: '220px', width: '220px' }}
          >
            {/* Round header */}
            <div className="mb-3 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {getRoundName(round.round_number, totalRounds)}
                </h3>
                {round.status === 'active' && (
                  <span className="inline-flex items-center rounded-full bg-[color:var(--active)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--active)] uppercase tracking-wide">
                    Live
                  </span>
                )}
                {round.status === 'completed' && (
                  <span className="inline-flex items-center rounded-full bg-[color:var(--winner)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--winner)] uppercase tracking-wide">
                    Done
                  </span>
                )}
              </div>
              {round.special_seder && (
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Seder: {round.special_seder}
                </p>
              )}
            </div>

            {/* Matchup column with connector lines */}
            <div className="relative flex flex-1 flex-col">
              {round.matchups.map((matchup, matchupIndex) => {
                // Each pair of matchups in the previous round feeds into one matchup in the next.
                // Vertical spacing grows with each round to align correctly.
                const spacingMultiplier = Math.pow(2, roundIndex);
                const itemHeight = 90; // px, approximate card height
                const gapBetweenCards = 16; // px

                // Top offset for this matchup card to center it relative to its pair slot
                const slotHeight = (itemHeight + gapBetweenCards) * spacingMultiplier;
                const topOffset = matchupIndex * slotHeight + (slotHeight / 2) - (itemHeight / 2);

                return (
                  <div
                    key={matchup.id}
                    className="absolute left-0 right-0"
                    style={{ top: `${topOffset}px` }}
                  >
                    <div className="relative flex items-center">
                      <div className="flex-1 pr-4">
                        <MatchupCard matchup={matchup} compact />
                      </div>

                      {/* Connector line to the right (skip for last round) */}
                      {!isLast && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                          {/* Horizontal line out to the right */}
                          <div className="h-px w-4 bg-border" />
                          {/* Vertical connector: connects to its pair */}
                          {matchupIndex % 2 === 0 ? (
                            <div
                              className="absolute left-4 top-1/2 w-px bg-border"
                              style={{
                                height: `${slotHeight}px`,
                                top: '0',
                              }}
                            />
                          ) : null}
                          {/* Horizontal line from vertical connector to next round (on even matchup) */}
                          {matchupIndex % 2 === 1 && (
                            <div
                              className="absolute left-4 h-px w-4 bg-border"
                              style={{
                                top: `calc(-${slotHeight / 2}px + 50%)`,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Phantom height div so the column takes up the right amount of space */}
              <div
                style={{
                  height: `${matchupCount * (90 + 16) * Math.pow(2, roundIndex)}px`,
                  minHeight: '200px',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------
// MAIN EXPORT
// -------------------------

export function BracketView({ rounds, totalRounds }: BracketViewProps) {
  if (rounds.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-3 text-4xl">📋</div>
        <h2 className="text-lg font-semibold text-foreground">Bracket Not Ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The tournament bracket has not been generated yet.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: visible below md */}
      <div className="flex h-full flex-col md:hidden">
        <MobileBracket rounds={rounds} totalRounds={totalRounds} />
      </div>

      {/* Desktop: visible at md and up */}
      <div className="hidden md:flex h-full">
        <DesktopBracket rounds={rounds} totalRounds={totalRounds} />
      </div>
    </>
  );
}
