import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { sendReminderEmail } from '@/lib/notifications';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Returns the current hour and minute in the configured timezone (default: America/New_York).
 */
function getCurrentTimeInTZ(): { hour: number; minute: number; dateStr: string } {
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
  const minute = parseInt(get('minute'), 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  // dateStr in YYYY-MM-DD format
  const dateStr = `${year}-${month}-${day}`;

  return { hour, minute, dateStr };
}

/**
 * Given a round's end_date (ISO date string YYYY-MM-DD), determine which reminder
 * type applies right now, if any.
 *
 * - Day before end_date, 16:30–17:30 → '5pm'
 * - end_date itself,     20:30–21:30 → '9pm'
 * - Day after end_date,  07:30–08:30 → '8am'
 */
function getReminderType(
  endDate: string,
  currentDateStr: string,
  hour: number,
  minute: number
): '5pm' | '9pm' | '8am' | null {
  // Build date-only strings relative to end_date
  const end = new Date(endDate + 'T12:00:00Z'); // noon UTC to avoid DST edge cases
  const dayBefore = new Date(end);
  dayBefore.setUTCDate(end.getUTCDate() - 1);
  const dayAfter = new Date(end);
  dayAfter.setUTCDate(end.getUTCDate() + 1);

  const toDateStr = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  const totalMinutes = hour * 60 + minute;

  if (currentDateStr === toDateStr(dayBefore)) {
    // 16:30–17:30 Eastern
    if (totalMinutes >= 16 * 60 + 30 && totalMinutes < 17 * 60 + 30) {
      return '5pm';
    }
  } else if (currentDateStr === endDate) {
    // 20:30–21:30 Eastern
    if (totalMinutes >= 20 * 60 + 30 && totalMinutes < 21 * 60 + 30) {
      return '9pm';
    }
  } else if (currentDateStr === toDateStr(dayAfter)) {
    // 07:30–08:30 Eastern
    if (totalMinutes >= 7 * 60 + 30 && totalMinutes < 8 * 60 + 30) {
      return '8am';
    }
  }

  return null;
}

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { hour, minute, dateStr: currentDateStr } = getCurrentTimeInTZ();

  let totalSent = 0;
  const errors: string[] = [];

  // 1. Find all active rounds
  const { data: activeRounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id, tournament_id, round_number, start_date, end_date, special_seder, status')
    .eq('status', 'active');

  if (roundsError) {
    console.error('[cron/reminders] Error fetching active rounds:', roundsError);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }

  if (!activeRounds || activeRounds.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No active rounds' });
  }

  for (const round of activeRounds) {
    const reminderType = getReminderType(round.end_date, currentDateStr, hour, minute);

    if (!reminderType) {
      continue;
    }

    const notificationType =
      reminderType === '5pm'
        ? 'reminder_5pm'
        : reminderType === '9pm'
        ? 'reminder_9pm'
        : 'late_grace_8am';

    // 2. Find all active matchups in this round
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('id, participant_1_id, participant_2_id')
      .eq('round_id', round.id)
      .is('winner_id', null);

    if (matchupsError) {
      console.error(`[cron/reminders] Error fetching matchups for round ${round.id}:`, matchupsError);
      errors.push(`round ${round.id}: matchups fetch failed`);
      continue;
    }

    if (!matchups || matchups.length === 0) continue;

    // Collect all participant IDs in active matchups
    const participantIds = new Set<string>();
    for (const m of matchups) {
      if (m.participant_1_id) participantIds.add(m.participant_1_id);
      if (m.participant_2_id) participantIds.add(m.participant_2_id);
    }

    if (participantIds.size === 0) continue;

    // 3. Find which participants have already submitted scores for their matchup
    const matchupIds = matchups.map((m) => m.id);
    const { data: submissions } = await supabase
      .from('score_submissions')
      .select('participant_id, matchup_id')
      .in('matchup_id', matchupIds);

    const submittedSet = new Set<string>(
      (submissions ?? []).map((s: { participant_id: string; matchup_id: string }) => `${s.participant_id}:${s.matchup_id}`)
    );

    // Build a map from participant -> their matchup id
    const participantMatchup = new Map<string, string>();
    for (const m of matchups) {
      if (m.participant_1_id) participantMatchup.set(m.participant_1_id, m.id);
      if (m.participant_2_id) participantMatchup.set(m.participant_2_id, m.id);
    }

    // Filter to participants who have NOT submitted yet
    const pendingIds = [...participantIds].filter((pid) => {
      const mid = participantMatchup.get(pid);
      return mid ? !submittedSet.has(`${pid}:${mid}`) : false;
    });

    if (pendingIds.length === 0) continue;

    // 4. Check notifications_log to avoid duplicates
    //    We consider a duplicate: same participant, same type, sent within the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('notifications_log')
      .select('participant_id')
      .eq('type', notificationType)
      .eq('channel', 'email')
      .in('participant_id', pendingIds)
      .gte('sent_at', twoHoursAgo);

    const alreadyNotified = new Set<string>(
      (recentLogs ?? []).map((l: { participant_id: string }) => l.participant_id)
    );

    const toNotify = pendingIds.filter((id) => !alreadyNotified.has(id));
    if (toNotify.length === 0) continue;

    // 5. Fetch participant details
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, name, email')
      .in('id', toNotify);

    if (participantsError || !participants) {
      console.error(`[cron/reminders] Error fetching participants:`, participantsError);
      errors.push(`round ${round.id}: participants fetch failed`);
      continue;
    }

    // 6. Send emails and log
    for (const participant of participants) {
      try {
        await sendReminderEmail({
          to: participant.email,
          participantName: participant.name,
          roundNumber: round.round_number,
          submitLink: `${APP_URL}/submit`,
          type: reminderType,
        });

        await supabase.from('notifications_log').insert({
          participant_id: participant.id,
          type: notificationType,
          channel: 'email',
        });

        totalSent++;
      } catch (err) {
        console.error(`[cron/reminders] Failed to send to ${participant.email}:`, err);
        errors.push(`participant ${participant.id}: send failed`);
      }
    }
  }

  return NextResponse.json({
    sent: totalSent,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
