import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { sendRoundResultsEmail } from '@/lib/notifications';
import { advanceWinners } from '@/lib/bracket';
import { MASECHTOS } from '@/lib/mishnah-data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Returns the current date string (YYYY-MM-DD) and hour in the configured timezone.
 */
function getCurrentTimeInTZ(): { hour: number; dateStr: string } {
  const tz = process.env.APP_TIMEZONE || 'America/New_York';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';

  const hour = parseInt(get('hour'), 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const dateStr = `${year}-${month}-${day}`;

  return { hour, dateStr };
}

/**
 * Returns the YYYY-MM-DD string for yesterday in the configured timezone.
 */
function getYesterdayStr(currentDateStr: string): string {
  const [year, month, day] = currentDateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { hour, dateStr: currentDateStr } = getCurrentTimeInTZ();

  // Only run after noon Eastern
  if (hour < 12) {
    return NextResponse.json({ message: 'Too early — finalize runs after noon Eastern', finalized: 0 });
  }

  const yesterdayStr = getYesterdayStr(currentDateStr);

  // Find active rounds whose end_date was yesterday
  const { data: roundsToFinalize, error: roundsError } = await supabase
    .from('rounds')
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .eq('status', 'active')
    .eq('end_date', yesterdayStr);

  if (roundsError) {
    console.error('[cron/finalize] Error fetching rounds:', roundsError);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }

  if (!roundsToFinalize || roundsToFinalize.length === 0) {
    return NextResponse.json({ finalized: 0, message: 'No rounds to finalize' });
  }

  const results: Array<{ roundId: string; status: string; error?: string }> = [];

  for (const round of roundsToFinalize) {
    try {
      // Fetch all matchups for this round
      const { data: matchups, error: matchupsError } = await supabase
        .from('matchups')
        .select('id, round_id, matchup_number, participant_1_id, participant_2_id, winner_id, p1_total_score, p2_total_score, special_masechta, next_matchup_id')
        .eq('round_id', round.id);

      if (matchupsError || !matchups) {
        throw new Error(`Failed to fetch matchups: ${matchupsError?.message}`);
      }

      // For each matchup, determine the winner based on total scores
      const winnerUpdates: Array<{ matchupId: string; winnerId: string; loserId: string | null }> = [];

      for (const matchup of matchups) {
        // Skip if winner already set
        if (matchup.winner_id) continue;

        const p1 = matchup.participant_1_id;
        const p2 = matchup.participant_2_id;

        let winnerId: string | null = null;
        let loserId: string | null = null;

        if (p1 && !p2) {
          // Bye — p1 advances automatically
          winnerId = p1;
        } else if (!p1 && p2) {
          winnerId = p2;
        } else if (p1 && p2) {
          // Compare scores; tie goes to p1 (higher seed / first listed)
          if (matchup.p1_total_score >= matchup.p2_total_score) {
            winnerId = p1;
            loserId = p2;
          } else {
            winnerId = p2;
            loserId = p1;
          }
        }

        if (winnerId) {
          winnerUpdates.push({ matchupId: matchup.id, winnerId, loserId });
        }
      }

      // Apply winner updates
      for (const { matchupId, winnerId } of winnerUpdates) {
        const { error } = await supabase
          .from('matchups')
          .update({ winner_id: winnerId })
          .eq('id', matchupId);
        if (error) throw new Error(`Failed to update matchup ${matchupId}: ${error.message}`);
      }

      // Mark losers as eliminated
      const loserIds = winnerUpdates
        .map((u) => u.loserId)
        .filter((id): id is string => id !== null);

      if (loserIds.length > 0) {
        const { error: elimError } = await supabase
          .from('participants')
          .update({ eliminated: true })
          .in('id', loserIds);
        if (elimError) throw new Error(`Failed to eliminate losers: ${elimError.message}`);
      }

      // Mark this round as completed
      const { error: roundUpdateError } = await supabase
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', round.id);
      if (roundUpdateError) throw new Error(`Failed to complete round: ${roundUpdateError.message}`);

      // Fetch the tournament to check if there are more rounds
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', round.tournament_id)
        .single();
      if (tournamentError || !tournament) throw new Error('Failed to fetch tournament');

      // Check if a next round already exists
      const nextRoundNumber = round.round_number + 1;
      const { data: existingNextRound } = await supabase
        .from('rounds')
        .select('id')
        .eq('tournament_id', round.tournament_id)
        .eq('round_number', nextRoundNumber)
        .maybeSingle();

      // Build winner list for advancement
      const completedMatchups = winnerUpdates.map(({ matchupId, winnerId }) => {
        const m = matchups.find((mu) => mu.id === matchupId)!;
        return { matchupNumber: m.matchup_number, winnerId };
      });

      const isFinal = completedMatchups.length === 1;

      if (isFinal) {
        // Tournament over — mark completed
        await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', round.tournament_id);
      } else if (!existingNextRound && completedMatchups.length > 1) {
        // Create the next round
        const nextRoundStartDate = currentDateStr;
        // End date: 7 days from now (simple default)
        const endD = new Date();
        endD.setUTCDate(endD.getUTCDate() + 7);
        const nextRoundEndDate = endD.toISOString().split('T')[0];

        const { data: newRound, error: newRoundError } = await supabase
          .from('rounds')
          .insert({
            tournament_id: round.tournament_id,
            round_number: nextRoundNumber,
            start_date: nextRoundStartDate,
            end_date: nextRoundEndDate,
            status: 'active' as const,
            special_seder: null,
          })
          .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
          .single();

        if (newRoundError || !newRound) {
          throw new Error(`Failed to create next round: ${newRoundError?.message}`);
        }

        // Update tournament's current_round
        await supabase
          .from('tournaments')
          .update({ current_round: nextRoundNumber })
          .eq('id', round.tournament_id);

        // Generate next round matchups
        const masechtas = MASECHTOS.map((m) => m.name);
        const nextMatchups = advanceWinners({
          currentRoundMatchups: completedMatchups,
          nextRoundId: newRound.id,
          masechtas,
        });

        for (const nm of nextMatchups) {
          const { error: insertError } = await supabase.from('matchups').insert({
            round_id: nm.roundId,
            matchup_number: nm.matchupNumber,
            participant_1_id: nm.participant1Id,
            participant_2_id: nm.participant2Id,
            special_masechta: nm.specialMasechta,
            next_matchup_id: null,
            p1_total_score: 0,
            p2_total_score: 0,
          });
          if (insertError) {
            console.error('[cron/finalize] Failed to insert next round matchup:', insertError);
          }
        }
      }

      // Send round results emails to all participants in the finalized round
      const allParticipantIds = new Set<string>();
      for (const m of matchups) {
        if (m.participant_1_id) allParticipantIds.add(m.participant_1_id);
        if (m.participant_2_id) allParticipantIds.add(m.participant_2_id);
      }

      if (allParticipantIds.size > 0) {
        const { data: participants } = await supabase
          .from('participants')
          .select('id, name, email')
          .in('id', [...allParticipantIds]);

        type ParticipantInfo = { id: string; name: string; email: string };
        const participantMap = new Map<string, ParticipantInfo>(
          (participants ?? []).map((p: ParticipantInfo) => [p.id, p])
        );

        for (const matchup of matchups) {
          const { participant_1_id: p1Id, participant_2_id: p2Id } = matchup;
          if (!p1Id || !p2Id) continue; // skip byes for results email

          const p1 = participantMap.get(p1Id);
          const p2 = participantMap.get(p2Id);
          if (!p1 || !p2) continue;

          const p1Won = matchup.winner_id === p1Id;
          const p2Won = matchup.winner_id === p2Id;

          const emailJobs = [
            {
              participant: p1,
              won: p1Won,
              score: matchup.p1_total_score,
              opponentScore: matchup.p2_total_score,
              opponentName: p2.name,
            },
            {
              participant: p2,
              won: p2Won,
              score: matchup.p2_total_score,
              opponentScore: matchup.p1_total_score,
              opponentName: p1.name,
            },
          ];

          for (const job of emailJobs) {
            try {
              await sendRoundResultsEmail({
                to: job.participant.email,
                participantName: job.participant.name,
                roundNumber: round.round_number,
                won: job.won,
                score: job.score,
                opponentScore: job.opponentScore,
                opponentName: job.opponentName,
                bracketLink: `${APP_URL}/bracket`,
              });

              await supabase.from('notifications_log').insert({
                participant_id: job.participant.id,
                type: 'round_results',
                channel: 'email',
              });
            } catch (emailErr) {
              console.error(
                `[cron/finalize] Failed to send results email to ${job.participant.email}:`,
                emailErr
              );
            }
          }
        }
      }

      results.push({ roundId: round.id, status: 'finalized' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/finalize] Error finalizing round ${round.id}:`, message);
      results.push({ roundId: round.id, status: 'error', error: message });
    }
  }

  return NextResponse.json({ finalized: results.filter((r) => r.status === 'finalized').length, results });
}
