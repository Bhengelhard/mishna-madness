'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/server';
import { calculateScore } from '@/lib/scoring';
import { getSederForMasechta, getMasechta, MASECHTOS } from '@/lib/mishnah-data';
import {
  generateBracket,
  generateSeeds,
  advanceWinners,
  getBracketSize,
} from '@/lib/bracket';
import {
  sendRoundStartEmail,
  sendRoundResultsEmail,
} from '@/lib/notifications';
import type {
  Participant,
  Tournament,
  Round,
  Matchup,
  ScoreSubmission,
} from '@/lib/types/database';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// 1. registerParticipant
// ---------------------------------------------------------------------------

export async function registerParticipant(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  participant?: Participant;
}> {
  const name = (formData.get('name') as string | null)?.trim();
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string | null)?.trim();

  if (!name || !email || !phone) {
    return { success: false, error: 'Name, email, and phone are required.' };
  }

  const supabase = getAdminClient();

  // Check active tournament and registration deadline
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, current_round, registration_deadline, created_at')
    .in('status', ['registration', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tournament) {
    return { success: false, error: 'No active tournament is currently accepting registrations.' };
  }

  if (tournament.status !== 'registration') {
    return { success: false, error: 'Registration is closed for this tournament.' };
  }

  const deadline = new Date(tournament.registration_deadline);
  if (new Date() > deadline) {
    return { success: false, error: 'The registration deadline has passed.' };
  }

  // Check for duplicate email — if already registered, return the existing participant
  const { data: existing } = await supabase
    .from('participants')
    .select('id, name, email, phone, seed, eliminated, created_at')
    .eq('email', email)
    .single();

  if (existing) {
    return { success: true, participant: existing };
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .insert({ name, email, phone })
    .select('id, name, email, phone, seed, eliminated, created_at')
    .single();

  if (error) {
    console.error('[registerParticipant]', error);
    return { success: false, error: 'Failed to register. Please try again.' };
  }

  revalidatePath('/');
  return { success: true, participant };
}

// ---------------------------------------------------------------------------
// 2. createTournament
// ---------------------------------------------------------------------------

export async function createTournament(data: {
  name: string;
  registrationDeadline: string;
}): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
  const supabase = getAdminClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      name: data.name,
      registration_deadline: data.registrationDeadline,
      status: 'registration',
      current_round: 1,
    })
    .select('id, name, status, current_round, registration_deadline, created_at')
    .single();

  if (error) {
    console.error('[createTournament]', error);
    return { success: false, error: 'Failed to create tournament.' };
  }

  revalidatePath('/');
  return { success: true, tournament };
}

// ---------------------------------------------------------------------------
// 3. generateTournamentBracket
// ---------------------------------------------------------------------------

export async function generateTournamentBracket(tournamentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getAdminClient();

  // Fetch all participants
  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('id')
    .eq('eliminated', false);

  if (pErr || !participants || participants.length < 2) {
    return { success: false, error: 'Not enough participants to generate a bracket.' };
  }

  const participantIds = participants.map((p: { id: string }) => p.id);

  // Generate round 1 date range (start now, end in 7 days)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  // Pick a random special seder
  const SEDER_NAMES = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Taharos'];
  const specialSeder = SEDER_NAMES[Math.floor(Math.random() * SEDER_NAMES.length)];

  // Create round 1
  const { data: round, error: rErr } = await supabase
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: 1,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      special_seder: specialSeder,
      status: 'active',
    })
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .single();

  if (rErr || !round) {
    console.error('[generateTournamentBracket] round insert', rErr);
    return { success: false, error: 'Failed to create round.' };
  }

  // Shuffle masechta names for assignment
  const masechtaNames = shuffleArray(MASECHTOS.map((m) => m.name));

  // Generate bracket matchups
  const matchupCreations = generateBracket({
    participantIds,
    roundId: round.id,
    masechtas: masechtaNames,
  });

  // Insert matchups
  const matchupInserts = matchupCreations.map((m) => ({
    round_id: m.roundId,
    matchup_number: m.matchupNumber,
    participant_1_id: m.participant1Id,
    participant_2_id: m.participant2Id,
    special_masechta: m.specialMasechta,
    p1_total_score: 0,
    p2_total_score: 0,
  }));

  const { error: mErr } = await supabase.from('matchups').insert(matchupInserts);

  if (mErr) {
    console.error('[generateTournamentBracket] matchup insert', mErr);
    return { success: false, error: 'Failed to create matchups.' };
  }

  // Seed participants
  const seeds = generateSeeds(participantIds);
  for (const [id, seed] of seeds.entries()) {
    await supabase.from('participants').update({ seed }).eq('id', id);
  }

  // Update tournament status to active
  await supabase
    .from('tournaments')
    .update({ status: 'active', current_round: 1 })
    .eq('id', tournamentId);

  // Send round start emails
  try {
    const { data: matchupsWithParticipants } = await supabase
      .from('matchups')
      .select(`
        id,
        special_masechta,
        participant_1_id,
        participant_2_id
      `)
      .eq('round_id', round.id);

    if (matchupsWithParticipants) {
      const allParticipantIds = [
        ...new Set(
          matchupsWithParticipants.flatMap((m) =>
            [m.participant_1_id, m.participant_2_id].filter(Boolean) as string[]
          )
        ),
      ];

      const { data: participantDetails } = await supabase
        .from('participants')
        .select('id, name, email')
        .in('id', allParticipantIds);

      const participantMap = new Map(
        (participantDetails ?? []).map((p) => [p.id, p])
      );

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

      for (const matchup of matchupsWithParticipants) {
        const p1 = matchup.participant_1_id ? participantMap.get(matchup.participant_1_id) : null;
        const p2 = matchup.participant_2_id ? participantMap.get(matchup.participant_2_id) : null;

        if (p1 && p2) {
          await sendRoundStartEmail({
            to: p1.email,
            participantName: p1.name,
            opponentName: p2.name,
            roundNumber: 1,
            specialMasechta: matchup.special_masechta,
            specialSeder,
            deadline: endDate.toLocaleDateString(),
            submitLink: `${siteUrl}/submit`,
          });

          await sendRoundStartEmail({
            to: p2.email,
            participantName: p2.name,
            opponentName: p1.name,
            roundNumber: 1,
            specialMasechta: matchup.special_masechta,
            specialSeder,
            deadline: endDate.toLocaleDateString(),
            submitLink: `${siteUrl}/submit`,
          });
        }
      }
    }
  } catch (emailErr) {
    // Non-fatal: log but don't fail the bracket generation
    console.error('[generateTournamentBracket] email send error', emailErr);
  }

  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. submitScore
// ---------------------------------------------------------------------------

export async function submitScore(data: {
  matchupId: string;
  participantId: string;
  masechta: string;
  mishnayosCount: number;
  learnedEntireMasechta: boolean;
}): Promise<{ success: boolean; submission?: ScoreSubmission; error?: string }> {
  const supabase = getAdminClient();

  // Look up the matchup to get special_masechta
  const { data: matchup, error: matchupErr } = await supabase
    .from('matchups')
    .select('id, round_id, matchup_number, participant_1_id, participant_2_id, special_masechta, winner_id, next_matchup_id, p1_total_score, p2_total_score')
    .eq('id', data.matchupId)
    .single();

  if (matchupErr || !matchup) {
    return { success: false, error: 'Matchup not found.' };
  }

  // Fetch the round for special_seder and end_date
  const { data: round } = await supabase
    .from('rounds')
    .select('special_seder, end_date')
    .eq('id', matchup.round_id)
    .single();

  const specialSeder = round?.special_seder ?? null;
  const endDate = round?.end_date ? new Date(round.end_date) : null;

  // Calculate score
  const scoreResult = calculateScore({
    mishnayosCount: data.mishnayosCount,
    masechta: data.masechta,
    specialMasechta: matchup.special_masechta,
    specialSeder,
  });

  // Determine if late submission
  // Late: after end_date midnight but before noon next day
  const now = new Date();
  let isLate = false;
  if (endDate) {
    const endMidnight = new Date(endDate);
    endMidnight.setHours(23, 59, 59, 999);
    const noonNextDay = new Date(endDate);
    noonNextDay.setDate(noonNextDay.getDate() + 1);
    noonNextDay.setHours(12, 0, 0, 0);

    if (now > endMidnight && now <= noonNextDay) {
      isLate = true;
    }
  }

  const seder = scoreResult.seder;

  // Insert score_submission
  const { data: submission, error: subErr } = await supabase
    .from('score_submissions')
    .insert({
      matchup_id: data.matchupId,
      participant_id: data.participantId,
      masechta: data.masechta,
      seder,
      mishnayos_count: data.mishnayosCount,
      is_special_masechta: scoreResult.isSpecialMasechta,
      is_special_seder: scoreResult.isSpecialSeder,
      learned_entire_masechta: data.learnedEntireMasechta,
      raw_points: scoreResult.rawPoints,
      multiplied_points: scoreResult.multipliedPoints,
      is_late: isLate,
    })
    .select('id, matchup_id, participant_id, masechta, seder, mishnayos_count, is_special_masechta, is_special_seder, learned_entire_masechta, raw_points, multiplied_points, submitted_at, is_late')
    .single();

  if (subErr) {
    console.error('[submitScore]', subErr);
    return { success: false, error: 'Failed to submit score.' };
  }

  // Recalculate participant's total score in the matchup
  await recalculateMatchupScore(data.matchupId, matchup.participant_1_id, matchup.participant_2_id);

  revalidatePath('/');
  return { success: true, submission };
}

// Internal helper to recalculate and persist matchup scores
async function recalculateMatchupScore(
  matchupId: string,
  participant1Id: string | null,
  participant2Id: string | null
): Promise<void> {
  const supabase = getAdminClient();

  const { data: allSubs } = await supabase
    .from('score_submissions')
    .select('participant_id, multiplied_points')
    .eq('matchup_id', matchupId);

  const subs = allSubs ?? [];

  const p1Total = subs
    .filter((s) => s.participant_id === participant1Id)
    .reduce((sum, s) => sum + s.multiplied_points, 0);

  const p2Total = subs
    .filter((s) => s.participant_id === participant2Id)
    .reduce((sum, s) => sum + s.multiplied_points, 0);

  await supabase
    .from('matchups')
    .update({ p1_total_score: p1Total, p2_total_score: p2Total })
    .eq('id', matchupId);
}

// ---------------------------------------------------------------------------
// 5. finalizeRound
// ---------------------------------------------------------------------------

export async function finalizeRound(roundId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getAdminClient();

  // Fetch the round
  const { data: round, error: roundErr } = await supabase
    .from('rounds')
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .eq('id', roundId)
    .single();

  if (roundErr || !round) {
    return { success: false, error: 'Round not found.' };
  }

  // Fetch all matchups for this round
  const { data: matchups, error: matchupsErr } = await supabase
    .from('matchups')
    .select('id, round_id, matchup_number, participant_1_id, participant_2_id, special_masechta, winner_id, next_matchup_id, p1_total_score, p2_total_score')
    .eq('round_id', roundId);

  if (matchupsErr || !matchups) {
    return { success: false, error: 'Failed to fetch matchups.' };
  }

  const winners: Array<{ matchupNumber: number; winnerId: string }> = [];

  for (const matchup of matchups) {
    // Determine winner; tie goes to participant_1
    let winnerId: string | null = null;
    let loserId: string | null = null;

    if (matchup.participant_1_id && matchup.participant_2_id) {
      if (matchup.p1_total_score >= matchup.p2_total_score) {
        winnerId = matchup.participant_1_id;
        loserId = matchup.participant_2_id;
      } else {
        winnerId = matchup.participant_2_id;
        loserId = matchup.participant_1_id;
      }
    } else if (matchup.participant_1_id) {
      // Bye: participant_1 advances automatically
      winnerId = matchup.participant_1_id;
    } else if (matchup.participant_2_id) {
      // Bye: participant_2 advances automatically
      winnerId = matchup.participant_2_id;
    }

    if (winnerId) {
      // Update matchup with winner
      await supabase
        .from('matchups')
        .update({ winner_id: winnerId })
        .eq('id', matchup.id);

      winners.push({ matchupNumber: matchup.matchup_number, winnerId });

      // Mark loser as eliminated
      if (loserId) {
        await supabase
          .from('participants')
          .update({ eliminated: true })
          .eq('id', loserId);
      }
    }
  }

  // Create next round if there are more than 1 winner (not the final)
  if (winners.length > 1) {
    const nextRoundNumber = round.round_number + 1;

    // Start next round 1 day after this one ends, run 7 days
    const nextStart = new Date(round.end_date);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 7);

    // Pick a new special seder for the next round
    const SEDER_NAMES = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Taharos'];
    const newSpecialSeder = SEDER_NAMES[Math.floor(Math.random() * SEDER_NAMES.length)];

    const { data: nextRound, error: nextRoundErr } = await supabase
      .from('rounds')
      .insert({
        tournament_id: round.tournament_id,
        round_number: nextRoundNumber,
        start_date: nextStart.toISOString(),
        end_date: nextEnd.toISOString(),
        special_seder: newSpecialSeder,
        status: 'active',
      })
      .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
      .single();

    if (nextRoundErr || !nextRound) {
      console.error('[finalizeRound] next round insert', nextRoundErr);
      return { success: false, error: 'Failed to create next round.' };
    }

    const masechtaNames = shuffleArray(MASECHTOS.map((m) => m.name));

    const nextMatchups = advanceWinners({
      currentRoundMatchups: winners,
      nextRoundId: nextRound.id,
      masechtas: masechtaNames,
    });

    const nextMatchupInserts = nextMatchups.map((m) => ({
      round_id: m.roundId,
      matchup_number: m.matchupNumber,
      participant_1_id: m.participant1Id,
      participant_2_id: m.participant2Id,
      special_masechta: m.specialMasechta,
      p1_total_score: 0,
      p2_total_score: 0,
    }));

    const { error: nextMErr } = await supabase.from('matchups').insert(nextMatchupInserts);

    if (nextMErr) {
      console.error('[finalizeRound] next matchup insert', nextMErr);
      return { success: false, error: 'Failed to create next round matchups.' };
    }

    // Update tournament current_round
    await supabase
      .from('tournaments')
      .update({ current_round: nextRoundNumber })
      .eq('id', round.tournament_id);

    // Send round results emails
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

      for (const matchup of matchups) {
        const p1Id = matchup.participant_1_id;
        const p2Id = matchup.participant_2_id;
        if (!p1Id || !p2Id) continue;

        const { data: pData } = await supabase
          .from('participants')
          .select('id, name, email')
          .in('id', [p1Id, p2Id]);

        if (!pData) continue;
        const pMap = new Map(pData.map((p) => [p.id, p]));
        const p1 = pMap.get(p1Id);
        const p2 = pMap.get(p2Id);
        if (!p1 || !p2) continue;

        const p1Won = matchup.winner_id === p1Id;

        await sendRoundResultsEmail({
          to: p1.email,
          participantName: p1.name,
          roundNumber: round.round_number,
          won: p1Won,
          score: matchup.p1_total_score,
          opponentScore: matchup.p2_total_score,
          opponentName: p2.name,
          bracketLink: `${siteUrl}/bracket`,
        });

        await sendRoundResultsEmail({
          to: p2.email,
          participantName: p2.name,
          roundNumber: round.round_number,
          won: !p1Won,
          score: matchup.p2_total_score,
          opponentScore: matchup.p1_total_score,
          opponentName: p1.name,
          bracketLink: `${siteUrl}/bracket`,
        });
      }
    } catch (emailErr) {
      console.error('[finalizeRound] email send error', emailErr);
    }
  } else {
    // Tournament is over: mark completed
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', round.tournament_id);
  }

  // Mark current round as completed
  await supabase
    .from('rounds')
    .update({ status: 'completed' })
    .eq('id', roundId);

  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. getActiveTournament
// ---------------------------------------------------------------------------

export async function getActiveTournament(): Promise<Tournament | null> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('tournaments')
    .select('id, name, status, current_round, registration_deadline, created_at')
    .in('status', ['registration', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data ?? null;
}

// ---------------------------------------------------------------------------
// 7. getTournamentBracket
// ---------------------------------------------------------------------------

export async function getTournamentBracket(tournamentId: string) {
  const supabase = getAdminClient();

  const { data: rounds, error: roundsErr } = await supabase
    .from('rounds')
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  if (roundsErr || !rounds) return null;

  const { data: matchups, error: matchupsErr } = await supabase
    .from('matchups')
    .select('id, round_id, matchup_number, participant_1_id, participant_2_id, special_masechta, winner_id, next_matchup_id, p1_total_score, p2_total_score')
    .in(
      'round_id',
      rounds.map((r) => r.id)
    )
    .order('matchup_number', { ascending: true });

  if (matchupsErr || !matchups) return null;

  // Collect all participant IDs
  const participantIds = [
    ...new Set(
      matchups.flatMap((m) =>
        [m.participant_1_id, m.participant_2_id, m.winner_id].filter(Boolean) as string[]
      )
    ),
  ];

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name')
    .in('id', participantIds);

  const participantMap = new Map((participants ?? []).map((p) => [p.id, p]));

  const enrichedRounds = rounds.map((round) => ({
    ...round,
    matchups: matchups
      .filter((m) => m.round_id === round.id)
      .map((m) => ({
        ...m,
        participant1: m.participant_1_id ? (participantMap.get(m.participant_1_id) ?? null) : null,
        participant2: m.participant_2_id ? (participantMap.get(m.participant_2_id) ?? null) : null,
        winner: m.winner_id ? (participantMap.get(m.winner_id) ?? null) : null,
      })),
  }));

  return { rounds: enrichedRounds };
}

// ---------------------------------------------------------------------------
// 8. getParticipantByEmail
// ---------------------------------------------------------------------------

export async function getParticipantByEmail(email: string): Promise<Participant | null> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('participants')
    .select('id, name, email, phone, seed, eliminated, created_at')
    .eq('email', email.toLowerCase().trim())
    .single();

  return data ?? null;
}

// ---------------------------------------------------------------------------
// 9. getParticipantMatchup
// ---------------------------------------------------------------------------

export async function getParticipantMatchup(
  participantId: string,
  roundId: string
): Promise<{
  matchup: Matchup & {
    participant1: Participant | null;
    participant2: Participant | null;
    opponent: Participant | null;
  };
  submissions: ScoreSubmission[];
} | null> {
  const supabase = getAdminClient();

  const { data: matchup, error } = await supabase
    .from('matchups')
    .select('id, round_id, matchup_number, participant_1_id, participant_2_id, special_masechta, winner_id, next_matchup_id, p1_total_score, p2_total_score')
    .eq('round_id', roundId)
    .or(`participant_1_id.eq.${participantId},participant_2_id.eq.${participantId}`)
    .single();

  if (error || !matchup) return null;

  const participantIds = [matchup.participant_1_id, matchup.participant_2_id].filter(
    Boolean
  ) as string[];

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, email, phone, seed, eliminated, created_at')
    .in('id', participantIds);

  const pMap = new Map((participants ?? []).map((p) => [p.id, p]));

  const p1 = matchup.participant_1_id ? (pMap.get(matchup.participant_1_id) ?? null) : null;
  const p2 = matchup.participant_2_id ? (pMap.get(matchup.participant_2_id) ?? null) : null;

  const opponentId =
    matchup.participant_1_id === participantId
      ? matchup.participant_2_id
      : matchup.participant_1_id;
  const opponent = opponentId ? (pMap.get(opponentId) ?? null) : null;

  const { data: submissions } = await supabase
    .from('score_submissions')
    .select('id, matchup_id, participant_id, masechta, seder, mishnayos_count, is_special_masechta, is_special_seder, learned_entire_masechta, raw_points, multiplied_points, submitted_at, is_late')
    .eq('matchup_id', matchup.id)
    .order('submitted_at', { ascending: false });

  return {
    matchup: { ...matchup, participant1: p1, participant2: p2, opponent },
    submissions: submissions ?? [],
  };
}

// ---------------------------------------------------------------------------
// 10. getParticipantSubmissions
// ---------------------------------------------------------------------------

export async function getParticipantSubmissions(
  matchupId: string,
  participantId: string
): Promise<ScoreSubmission[]> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('score_submissions')
    .select('id, matchup_id, participant_id, masechta, seder, mishnayos_count, is_special_masechta, is_special_seder, learned_entire_masechta, raw_points, multiplied_points, submitted_at, is_late')
    .eq('matchup_id', matchupId)
    .eq('participant_id', participantId)
    .order('submitted_at', { ascending: false });

  return data ?? [];
}

// ---------------------------------------------------------------------------
// 11. deleteSubmission
// ---------------------------------------------------------------------------

export async function deleteSubmission(
  submissionId: string,
  matchupId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // Verify the submission belongs to the participant (safety check)
  const { data: sub, error: fetchErr } = await supabase
    .from('score_submissions')
    .select('id, matchup_id, participant_id')
    .eq('id', submissionId)
    .single();

  if (fetchErr || !sub) {
    return { success: false, error: 'Submission not found.' };
  }

  if (sub.participant_id !== participantId || sub.matchup_id !== matchupId) {
    return { success: false, error: 'Unauthorized to delete this submission.' };
  }

  const { error: deleteErr } = await supabase
    .from('score_submissions')
    .delete()
    .eq('id', submissionId);

  if (deleteErr) {
    console.error('[deleteSubmission]', deleteErr);
    return { success: false, error: 'Failed to delete submission.' };
  }

  // Recalculate matchup totals
  const { data: matchup } = await supabase
    .from('matchups')
    .select('participant_1_id, participant_2_id')
    .eq('id', matchupId)
    .single();

  if (matchup) {
    await recalculateMatchupScore(matchupId, matchup.participant_1_id, matchup.participant_2_id);
  }

  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 12. adminLogin
// ---------------------------------------------------------------------------

export async function adminLogin(password: string): Promise<{ success: boolean }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return { success: false };
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// 13. getAllParticipants
// ---------------------------------------------------------------------------

export async function getAllParticipants(): Promise<Participant[]> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('participants')
    .select('id, name, email, phone, seed, eliminated, created_at')
    .order('name', { ascending: true });

  return data ?? [];
}

// ---------------------------------------------------------------------------
// 14. updateParticipant
// ---------------------------------------------------------------------------

export async function updateParticipant(
  id: string,
  data: { name?: string; email?: string; phone?: string; eliminated?: boolean }
): Promise<{ success: boolean; participant?: Participant; error?: string }> {
  const supabase = getAdminClient();

  const { data: participant, error } = await supabase
    .from('participants')
    .update(data)
    .eq('id', id)
    .select('id, name, email, phone, seed, eliminated, created_at')
    .single();

  if (error) {
    console.error('[updateParticipant]', error);
    return { success: false, error: 'Failed to update participant.' };
  }

  revalidatePath('/');
  return { success: true, participant };
}

// ---------------------------------------------------------------------------
// 15. deleteParticipant
// ---------------------------------------------------------------------------

export async function deleteParticipant(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await supabase.from('participants').delete().eq('id', id);

  if (error) {
    console.error('[deleteParticipant]', error);
    return { success: false, error: 'Failed to delete participant.' };
  }

  revalidatePath('/');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 16. updateMatchupScores
// ---------------------------------------------------------------------------

export async function updateMatchupScores(
  matchupId: string,
  data: {
    p1_total_score?: number;
    p2_total_score?: number;
    winner_id?: string | null;
  }
): Promise<{ success: boolean; matchup?: Matchup; error?: string }> {
  const supabase = getAdminClient();

  const { data: matchup, error } = await supabase
    .from('matchups')
    .update(data)
    .eq('id', matchupId)
    .select('id, round_id, matchup_number, participant_1_id, participant_2_id, special_masechta, winner_id, next_matchup_id, p1_total_score, p2_total_score')
    .single();

  if (error) {
    console.error('[updateMatchupScores]', error);
    return { success: false, error: 'Failed to update matchup scores.' };
  }

  revalidatePath('/');
  return { success: true, matchup };
}

// ---------------------------------------------------------------------------
// 17. getRounds
// ---------------------------------------------------------------------------

export async function getRounds(tournamentId: string): Promise<Round[]> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('rounds')
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  return data ?? [];
}

// ---------------------------------------------------------------------------
// 18. updateRound
// ---------------------------------------------------------------------------

export async function updateRound(
  roundId: string,
  data: {
    start_date?: string;
    end_date?: string;
    special_seder?: string;
    status?: 'upcoming' | 'active' | 'completed';
  }
): Promise<{ success: boolean; round?: Round; error?: string }> {
  const supabase = getAdminClient();

  const { data: round, error } = await supabase
    .from('rounds')
    .update(data)
    .eq('id', roundId)
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .single();

  if (error) {
    console.error('[updateRound]', error);
    return { success: false, error: 'Failed to update round.' };
  }

  revalidatePath('/');
  return { success: true, round };
}
