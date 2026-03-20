export interface MatchupCreation {
  roundId: string;
  matchupNumber: number;
  participant1Id: string | null;
  participant2Id: string | null;
  specialMasechta: string;
  nextMatchupNumber: number | null;
}

export function generateSeeds(participantIds: string[]): Map<string, number> {
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
  const seeds = new Map<string, number>();
  shuffled.forEach((id, index) => {
    seeds.set(id, index + 1);
  });
  return seeds;
}

export function generateBracket(params: {
  participantIds: string[];
  roundId: string;
  masechtas: string[];
}): MatchupCreation[] {
  const { participantIds, roundId, masechtas } = params;
  const bracketSize = getBracketSize(participantIds.length);
  const seeds = generateSeeds(participantIds);

  // Sort participants by seed
  const sorted = [...participantIds].sort((a, b) => {
    return (seeds.get(a) ?? 0) - (seeds.get(b) ?? 0);
  });

  // Pad with nulls to fill bracket size
  const padded: (string | null)[] = [...sorted];
  while (padded.length < bracketSize) {
    padded.push(null);
  }

  const numMatchups = bracketSize / 2;
  const matchups: MatchupCreation[] = [];

  for (let i = 0; i < numMatchups; i++) {
    const matchupNumber = i + 1;
    const topSeedIndex = i;
    const bottomSeedIndex = bracketSize - 1 - i;
    const masechta = masechtas[i % masechtas.length];
    const nextMatchupNumber = getNextMatchupNumber(matchupNumber);

    matchups.push({
      roundId,
      matchupNumber,
      participant1Id: padded[topSeedIndex],
      participant2Id: padded[bottomSeedIndex],
      specialMasechta: masechta,
      nextMatchupNumber,
    });
  }

  return matchups;
}

export function getNextMatchupNumber(matchupNumber: number): number {
  return Math.ceil(matchupNumber / 2);
}

export function advanceWinners(params: {
  currentRoundMatchups: Array<{ matchupNumber: number; winnerId: string }>;
  nextRoundId: string;
  masechtas: string[];
}): MatchupCreation[] {
  const { currentRoundMatchups, nextRoundId, masechtas } = params;

  // Sort by matchup number to ensure correct pairing
  const sorted = [...currentRoundMatchups].sort(
    (a, b) => a.matchupNumber - b.matchupNumber
  );

  const nextRoundMatchups: MatchupCreation[] = [];

  for (let i = 0; i < sorted.length; i += 2) {
    const matchup1 = sorted[i];
    const matchup2 = sorted[i + 1];
    const newMatchupNumber = getNextMatchupNumber(matchup1.matchupNumber);
    const masechta = masechtas[(newMatchupNumber - 1) % masechtas.length];
    const numNextMatchups = sorted.length / 2;
    const nextMatchupNumber =
      numNextMatchups > 1 ? getNextMatchupNumber(newMatchupNumber) : null;

    nextRoundMatchups.push({
      roundId: nextRoundId,
      matchupNumber: newMatchupNumber,
      participant1Id: matchup1.winnerId,
      participant2Id: matchup2?.winnerId ?? null,
      specialMasechta: masechta,
      nextMatchupNumber,
    });
  }

  return nextRoundMatchups;
}

export function getBracketSize(participantCount: number): number {
  if (participantCount <= 16) return 16;
  if (participantCount <= 32) return 32;
  return 64;
}

export function getRoundName(
  roundNumber: number,
  totalRounds: number
): string {
  // roundNumber is 1-based, where 1 is the first round
  const roundsFromEnd = totalRounds - roundNumber;

  switch (roundsFromEnd) {
    case 0:
      return "Championship";
    case 1:
      return "Final Four";
    case 2:
      return "Elite 8";
    case 3:
      return "Sweet 16";
    case 4:
      return "Round of 32";
    case 5:
      return "Round of 64";
    default: {
      // For any earlier rounds, calculate the number of participants
      const participantsInRound = Math.pow(2, roundsFromEnd + 1);
      return `Round of ${participantsInRound}`;
    }
  }
}
