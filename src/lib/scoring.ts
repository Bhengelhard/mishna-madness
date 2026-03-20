import { getSederForMasechta } from "@/lib/mishnah-data";

export interface ScoreInput {
  mishnayosCount: number;
  masechta: string;
  specialMasechta: string;
  specialSeder: string | null;
}

export interface ScoreResult {
  rawPoints: number;
  multipliedPoints: number;
  isSpecialMasechta: boolean;
  isSpecialSeder: boolean;
  multiplier: number;
  seder: string;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { mishnayosCount, masechta, specialMasechta, specialSeder } = input;

  const seder = getSederForMasechta(masechta) ?? "";
  const isSpecialMasechta = masechta === specialMasechta;
  const isSpecialSeder =
    specialSeder !== null && seder === specialSeder && !isSpecialMasechta;

  // Special masechta takes priority over special seder (3x vs 2x)
  let multiplier = 1;
  if (isSpecialMasechta) {
    multiplier = 3;
  } else if (isSpecialSeder) {
    multiplier = 2;
  }

  const rawPoints = mishnayosCount;
  const multipliedPoints = mishnayosCount * multiplier;

  return {
    rawPoints,
    multipliedPoints,
    isSpecialMasechta,
    isSpecialSeder,
    multiplier,
    seder,
  };
}

export function calculateTotalScore(
  submissions: { multiplied_points: number }[]
): number {
  return submissions.reduce((total, s) => total + s.multiplied_points, 0);
}
