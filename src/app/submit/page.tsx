'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitScore,
  getParticipantMatchup,
  getActiveTournament,
  deleteSubmission,
  getRounds,
} from '@/lib/actions';
import { MASECHTOS, getMasechta, getSederForMasechta } from '@/lib/mishnah-data';
import { calculateScore } from '@/lib/scoring';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Round, Matchup, ScoreSubmission, Participant } from '@/lib/types/database';

type MatchupWithParticipants = Matchup & {
  participant1: Participant | null;
  participant2: Participant | null;
  opponent: Participant | null;
};

const SEDARIM_ORDER = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Taharos'];

const GROUPED_MASECHTOS = SEDARIM_ORDER.map((seder) => ({
  seder,
  masechtos: MASECHTOS.filter((m) => m.seder === seder),
}));

export default function SubmitPage() {
  const router = useRouter();

  // Participant identity from localStorage
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);

  // Data state
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [matchup, setMatchup] = useState<MatchupWithParticipants | null>(null);
  const [mySubmissions, setMySubmissions] = useState<ScoreSubmission[]>([]);
  const [opponentSubmissions, setOpponentSubmissions] = useState<ScoreSubmission[]>([]);

  // Page state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form state
  const [selectedMasechta, setSelectedMasechta] = useState<string>('');
  const [mishnayosCount, setMishnayosCount] = useState<string>('');
  const [completedEntire, setCompletedEntire] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async (pId: string) => {
    try {
      const tournament = await getActiveTournament();
      if (!tournament || tournament.status !== 'active') {
        setInfoMessage('No active tournament right now. Check back later.');
        setLoading(false);
        return;
      }

      const rounds = await getRounds(tournament.id);
      const round = rounds.find((r) => r.status === 'active') ?? null;

      if (!round) {
        setInfoMessage('No active round right now. Check back when the next round begins.');
        setLoading(false);
        return;
      }

      setActiveRound(round);

      const result = await getParticipantMatchup(pId, round.id);
      if (!result) {
        setInfoMessage('No matchup found for you in the current round.');
        setLoading(false);
        return;
      }

      setMatchup(result.matchup);

      // Split submissions by participant
      const mySubs = result.submissions.filter((s) => s.participant_id === pId);
      const opponentId =
        result.matchup.participant_1_id === pId
          ? result.matchup.participant_2_id
          : result.matchup.participant_1_id;
      const oppSubs = result.submissions.filter((s) => s.participant_id === opponentId);

      setMySubmissions(mySubs);
      setOpponentSubmissions(oppSubs);
    } catch {
      setError('Failed to load matchup data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('participantId');
    const name = localStorage.getItem('participantName');

    if (!id || !name) {
      router.replace('/login');
      return;
    }

    setParticipantId(id);
    setParticipantName(name);
    loadData(id);
  }, [router, loadData]);

  // Masechta selection effects
  const selectedMasechtaData = selectedMasechta ? getMasechta(selectedMasechta) : null;

  useEffect(() => {
    if (completedEntire && selectedMasechtaData) {
      setMishnayosCount(String(selectedMasechtaData.totalMishnayos));
    }
  }, [completedEntire, selectedMasechtaData]);

  useEffect(() => {
    if (!completedEntire || !selectedMasechtaData) return;
    const current = parseInt(mishnayosCount, 10);
    if (current !== selectedMasechtaData.totalMishnayos) {
      setCompletedEntire(false);
    }
  }, [mishnayosCount, completedEntire, selectedMasechtaData]);

  // Point preview calculation
  const previewScore = (() => {
    if (!matchup || !selectedMasechta || !mishnayosCount) return null;
    const count = parseInt(mishnayosCount, 10);
    if (isNaN(count) || count <= 0) return null;
    return calculateScore({
      mishnayosCount: count,
      masechta: selectedMasechta,
      specialMasechta: matchup.special_masechta,
      specialSeder: activeRound?.special_seder ?? null,
    });
  })();

  const isP1 = matchup?.participant_1_id === participantId;
  const myMatchupTotal = isP1 ? matchup?.p1_total_score ?? 0 : matchup?.p2_total_score ?? 0;
  const opponentMatchupTotal = isP1 ? matchup?.p2_total_score ?? 0 : matchup?.p1_total_score ?? 0;

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!participantId || !matchup) return;
    if (!selectedMasechta) {
      setSubmitError('Please select a masechta.');
      return;
    }
    const count = parseInt(mishnayosCount, 10);
    if (isNaN(count) || count <= 0) {
      setSubmitError('Please enter a valid number of mishnayos.');
      return;
    }

    startTransition(async () => {
      const result = await submitScore({
        matchupId: matchup.id,
        participantId,
        masechta: selectedMasechta,
        mishnayosCount: count,
        learnedEntireMasechta: completedEntire,
      });

      if (!result.success) {
        setSubmitError(result.error ?? 'Submission failed. Please try again.');
        return;
      }

      setSubmitSuccess(`Submitted! +${previewScore?.multipliedPoints ?? count} points`);
      setSelectedMasechta('');
      setMishnayosCount('');
      setCompletedEntire(false);

      // Refresh data
      await loadData(participantId);
    });
  };

  // Delete submission
  const handleDelete = (submissionId: string) => {
    if (deleteConfirmId !== submissionId) {
      setDeleteConfirmId(submissionId);
      return;
    }

    setDeletingId(submissionId);
    setDeleteConfirmId(null);

    startTransition(async () => {
      if (!participantId || !matchup) return;
      const result = await deleteSubmission(submissionId, matchup.id, participantId);
      setDeletingId(null);

      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to delete submission.');
        return;
      }

      await loadData(participantId);
    });
  };

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your matchup...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (infoMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-xl text-green-800">Mishna Madness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{infoMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchup || !activeRound) {
    return null;
  }

  const opponentName = matchup.opponent?.name ?? 'Bye';
  const isBye = !matchup.opponent;

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="w-full max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Header: Matchup Info */}
        <Card className="border-2 border-green-700 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="text-center space-y-1 mb-3">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Round {activeRound.round_number}
              </p>
              <h1 className="text-2xl font-bold text-green-900 dark:text-green-100 leading-tight">
                {participantName}
              </h1>
              <p className="text-sm text-muted-foreground">vs.</p>
              <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
                {opponentName}
              </h2>
            </div>

            {/* Score display */}
            {!isBye && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center border border-green-200">
                  <p className="text-xs text-muted-foreground mb-0.5">Your Score</p>
                  <p className="text-3xl font-bold text-green-700">{myMatchupTotal}</p>
                  <p className="text-xs text-green-600 font-medium">pts</p>
                </div>
                <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center border border-green-200">
                  <p className="text-xs text-muted-foreground mb-0.5">{opponentName}</p>
                  <p className="text-3xl font-bold text-slate-600">{opponentMatchupTotal}</p>
                  <p className="text-xs text-slate-500 font-medium">pts</p>
                </div>
              </div>
            )}

            {isBye && (
              <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center border border-green-200 mt-3">
                <p className="text-xs text-muted-foreground mb-0.5">Your Score (Bye Round)</p>
                <p className="text-3xl font-bold text-green-700">{myMatchupTotal}</p>
                <p className="text-xs text-green-600 font-medium">pts</p>
              </div>
            )}

            {/* Deadline */}
            <p className="text-center text-xs text-muted-foreground mt-3">
              Deadline: {new Date(activeRound.end_date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>

        {/* Bonus multipliers */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs font-bold mb-1">
                3x POINTS
              </Badge>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 leading-snug mt-1 truncate">
                {matchup.special_masechta}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Special Masechta</p>
            </div>
          </div>
          {activeRound.special_seder && (
            <div className="flex-1 min-w-0">
              <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/20 p-3 text-center">
                <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs font-bold mb-1">
                  2x POINTS
                </Badge>
                <p className="text-xs font-medium text-green-800 dark:text-green-300 leading-snug mt-1 truncate">
                  Seder {activeRound.special_seder}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Special Seder</p>
              </div>
            </div>
          )}
        </div>

        {/* Score Submission Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-800">Log Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Masechta selector */}
              <div className="space-y-1.5">
                <Label htmlFor="masechta" className="text-sm font-medium">
                  Masechta
                </Label>
                <Select
                  value={selectedMasechta}
                  onValueChange={(val: string | null) => {
                    setSelectedMasechta(val ?? '');
                    setCompletedEntire(false);
                    setMishnayosCount('');
                  }}
                >
                  <SelectTrigger
                    id="masechta"
                    className="min-h-[44px] text-base"
                  >
                    <SelectValue placeholder="Select a masechta..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GROUPED_MASECHTOS.map(({ seder, masechtos }) => (
                      <div key={seder}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-background">
                          {seder}
                        </div>
                        {masechtos.map((m) => (
                          <SelectItem key={m.name} value={m.name} className="text-sm pl-4">
                            <span className="flex items-center justify-between w-full gap-2">
                              <span>{m.name}</span>
                              {m.name === matchup.special_masechta && (
                                <span className="text-amber-600 text-xs font-bold">3x</span>
                              )}
                              {m.name !== matchup.special_masechta &&
                                activeRound.special_seder &&
                                getSederForMasechta(m.name) === activeRound.special_seder && (
                                  <span className="text-green-600 text-xs font-bold">2x</span>
                                )}
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>

                {/* Masechta info */}
                {selectedMasechtaData && (
                  <p className="text-xs text-muted-foreground pl-1">
                    {selectedMasechtaData.chapters} chapters, {selectedMasechtaData.totalMishnayos} total mishnayos
                    {selectedMasechta === matchup.special_masechta && (
                      <span className="ml-2 text-amber-600 font-semibold">Special Masechta (3x)</span>
                    )}
                    {selectedMasechta !== matchup.special_masechta &&
                      activeRound.special_seder &&
                      getSederForMasechta(selectedMasechta) === activeRound.special_seder && (
                        <span className="ml-2 text-green-600 font-semibold">Special Seder (2x)</span>
                      )}
                  </p>
                )}
              </div>

              {/* Complete masechta checkbox */}
              {selectedMasechtaData && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                  <Checkbox
                    id="complete"
                    checked={completedEntire}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setCompletedEntire(isChecked);
                      if (isChecked && selectedMasechtaData) {
                        setMishnayosCount(String(selectedMasechtaData.totalMishnayos));
                      }
                    }}
                    className="h-5 w-5 shrink-0"
                  />
                  <Label htmlFor="complete" className="text-sm cursor-pointer leading-snug">
                    I completed the entire Masechta
                    <span className="block text-xs text-muted-foreground font-normal">
                      Auto-fills {selectedMasechtaData.totalMishnayos} mishnayos
                    </span>
                  </Label>
                </div>
              )}

              {/* Mishnayos count */}
              <div className="space-y-1.5">
                <Label htmlFor="count" className="text-sm font-medium">
                  Number of Mishnayos
                </Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={selectedMasechtaData?.totalMishnayos ?? 9999}
                  value={mishnayosCount}
                  onChange={(e) => setMishnayosCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="min-h-[44px] text-base"
                />
                {selectedMasechtaData && mishnayosCount && (
                  (() => {
                    const count = parseInt(mishnayosCount, 10);
                    if (!isNaN(count) && count > selectedMasechtaData.totalMishnayos) {
                      return (
                        <p className="text-xs text-destructive pl-1">
                          Max {selectedMasechtaData.totalMishnayos} mishnayos in {selectedMasechta}
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              {/* Points preview */}
              {previewScore && (
                <div className={`rounded-lg border-2 p-3 text-center transition-all ${
                  previewScore.multiplier === 3
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                    : previewScore.multiplier === 2
                    ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                    : 'border-slate-200 bg-slate-50 dark:bg-slate-900/20'
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Points Preview</p>
                  <div className="flex items-center justify-center gap-2">
                    {previewScore.multiplier > 1 && (
                      <span className="text-sm text-muted-foreground line-through">
                        {previewScore.rawPoints}
                      </span>
                    )}
                    <span className={`text-3xl font-bold ${
                      previewScore.multiplier === 3
                        ? 'text-amber-600'
                        : previewScore.multiplier === 2
                        ? 'text-green-600'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      +{previewScore.multipliedPoints}
                    </span>
                    {previewScore.multiplier > 1 && (
                      <Badge className={`text-xs font-bold ${
                        previewScore.multiplier === 3
                          ? 'bg-amber-500 hover:bg-amber-500'
                          : 'bg-green-600 hover:bg-green-600'
                      } text-white`}>
                        {previewScore.multiplier}x
                      </Badge>
                    )}
                  </div>
                  {previewScore.multiplier > 1 && (
                    <p className={`text-xs mt-1 font-medium ${
                      previewScore.multiplier === 3 ? 'text-amber-700' : 'text-green-700'
                    }`}>
                      {previewScore.isSpecialMasechta
                        ? `Special Masechta bonus: ${previewScore.rawPoints} x 3`
                        : `Special Seder bonus: ${previewScore.rawPoints} x 2`}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{submitError}</AlertDescription>
                </Alert>
              )}
              {submitSuccess && (
                <Alert className="border-green-400 bg-green-50 dark:bg-green-950/20">
                  <AlertDescription className="text-sm text-green-800 dark:text-green-300 font-medium">
                    {submitSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isPending || !selectedMasechta || !mishnayosCount}
                className="w-full min-h-[52px] text-base font-semibold bg-green-700 hover:bg-green-800 text-white"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Score'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Previous Submissions */}
        {mySubmissions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-800 flex items-center justify-between">
                <span>Your Submissions</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {mySubmissions.length} {mySubmissions.length === 1 ? 'entry' : 'entries'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {mySubmissions.map((sub) => (
                <div key={sub.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm">{sub.masechta}</span>
                        {sub.is_special_masechta && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs px-1.5 py-0">
                            3x
                          </Badge>
                        )}
                        {sub.is_special_seder && !sub.is_special_masechta && (
                          <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs px-1.5 py-0">
                            2x
                          </Badge>
                        )}
                        {sub.learned_entire_masechta && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-400 text-green-700">
                            Full
                          </Badge>
                        )}
                        {sub.is_late && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-orange-400 text-orange-600">
                            Late
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sub.mishnayos_count} mishnayos
                        {sub.raw_points !== sub.multiplied_points && (
                          <span> &times; {Math.round(sub.multiplied_points / sub.raw_points)}</span>
                        )}
                        {' '}
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.submitted_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-700">+{sub.multiplied_points}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>

                  {/* Delete button */}
                  <div className="flex justify-end gap-2">
                    {deleteConfirmId === sub.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleDelete(sub.id)}
                          disabled={isPending || deletingId === sub.id}
                        >
                          {deletingId === sub.id ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(sub.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Separator className="my-2" />
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-green-800">Total</span>
                <span className="text-xl font-bold text-green-700">{myMatchupTotal} pts</span>
              </div>
            </CardContent>
          </Card>
        )}

        {mySubmissions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            No submissions yet. Log your learning above!
          </p>
        )}

      </div>
    </div>
  );
}
