'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTournament,
  generateTournamentBracket,
  getAllParticipants,
  updateParticipant,
  deleteParticipant,
  getActiveTournament,
  getRounds,
  updateRound,
  finalizeRound,
  registerParticipant,
  updateMatchupScores,
  getTournamentBracket,
} from '@/lib/actions';
import type {
  Tournament,
  Participant,
  Round,
  Matchup,
} from '@/lib/types/database';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MoreHorizontalIcon, PlusIcon, RefreshCwIcon, TrophyIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EnrichedMatchup = Matchup & {
  participant1: { id: string; name: string } | null;
  participant2: { id: string; name: string } | null;
  winner: { id: string; name: string } | null;
};

type EnrichedRound = Round & { matchups: EnrichedMatchup[] };

type BracketData = { rounds: EnrichedRound[] } | null;

type NotificationRow = {
  id: string;
  participant_id: string;
  participant_name?: string;
  type: string;
  sent_at: string;
  channel: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === 'registration') {
    return (
      <Badge className="bg-primary/15 text-primary border-primary/30">
        Registration
      </Badge>
    );
  }
  if (status === 'active') {
    return (
      <Badge className="bg-[color:var(--active)]/15 text-[color:var(--active)] border-[color:var(--active)]/30">
        Active
      </Badge>
    );
  }
  if (status === 'completed') {
    return <Badge variant="secondary">Completed</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function SuccessMsg({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Tournament
// ---------------------------------------------------------------------------

function TournamentTab({
  tournament,
  onRefresh,
}: {
  tournament: Tournament | null;
  onRefresh: () => void;
}) {
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

  const activeRound = rounds.find((r) => r.status === 'active') ?? null;

  useEffect(() => {
    if (tournament) {
      getRounds(tournament.id).then(setRounds);
    }
  }, [tournament]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCreating(true);
    try {
      const result = await createTournament({ name, registrationDeadline: deadline });
      if (result.success) {
        setMsg({ type: 'success', text: 'Tournament created successfully.' });
        setName('');
        setDeadline('');
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to create tournament.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerate() {
    if (!tournament) return;
    setMsg(null);
    setGenerating(true);
    try {
      const result = await generateTournamentBracket(tournament.id);
      if (result.success) {
        setMsg({ type: 'success', text: 'Bracket generated and round 1 is now active.' });
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to generate bracket.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalize() {
    if (!activeRound) return;
    setMsg(null);
    setFinalizing(true);
    try {
      const result = await finalizeRound(activeRound.id);
      if (result.success) {
        setMsg({ type: 'success', text: `Round ${activeRound.round_number} finalized.` });
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to finalize round.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {msg?.type === 'error' && <ErrorMsg message={msg.text} />}
      {msg?.type === 'success' && <SuccessMsg message={msg.text} />}

      {/* Current tournament status */}
      {tournament ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">{tournament.name}</CardTitle>
              <StatusBadge status={tournament.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Current Round</span>
                <p className="font-medium">{tournament.current_round}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reg. Deadline</span>
                <p className="font-medium">
                  {new Date(tournament.registration_deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tournament.status === 'registration' && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  size="sm"
                  className="gap-1.5"
                >
                  <TrophyIcon className="size-4" />
                  {generating ? 'Generating...' : 'Generate Bracket'}
                </Button>
              )}

              {tournament.status === 'active' && activeRound && (
                <Button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  {finalizing
                    ? 'Finalizing...'
                    : `Finalize Round ${activeRound.round_number}`}
                </Button>
              )}
            </div>

            {tournament.status === 'active' && activeRound && (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium">
                  Active: Round {activeRound.round_number}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {new Date(activeRound.start_date).toLocaleDateString()} -{' '}
                  {new Date(activeRound.end_date).toLocaleDateString()}
                  {activeRound.special_seder && ` | Special Seder: ${activeRound.special_seder}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No active tournament. Create one below.
        </div>
      )}

      {/* Create tournament form */}
      {!tournament && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Create Tournament</CardTitle>
            <CardDescription>Start a new Mishna Madness tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-name" className="text-sm font-medium">
                  Tournament Name
                </Label>
                <Input
                  id="t-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mishna Madness 2026"
                  required
                  disabled={creating}
                  className="h-9"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-deadline" className="text-sm font-medium">
                  Registration Deadline
                </Label>
                <Input
                  id="t-deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  disabled={creating}
                  className="h-9"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={creating || !name || !deadline}
                className="w-fit gap-1.5"
              >
                <PlusIcon className="size-4" />
                {creating ? 'Creating...' : 'Create Tournament'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Participants
// ---------------------------------------------------------------------------

function ParticipantsTab({
  participants,
  onRefresh,
}: {
  participants: Participant[];
  onRefresh: () => void;
}) {
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<Participant | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(p: Participant) {
    setEditTarget(p);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditPhone(p.phone);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setAdding(true);
    try {
      const fd = new FormData();
      fd.set('name', addName);
      fd.set('email', addEmail);
      fd.set('phone', addPhone);
      const result = await registerParticipant(fd);
      if (result.success) {
        setMsg({ type: 'success', text: `${addName} registered successfully.` });
        setAddName('');
        setAddEmail('');
        setAddPhone('');
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to register participant.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setAdding(false);
    }
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const result = await updateParticipant(editTarget.id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
      });
      if (result.success) {
        setEditTarget(null);
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to update participant.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteParticipant(deleteTarget.id);
      if (result.success) {
        setDeleteTarget(null);
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to delete participant.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error. Please try again.' });
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleEliminated(p: Participant) {
    const result = await updateParticipant(p.id, { eliminated: !p.eliminated });
    if (result.success) {
      onRefresh();
    } else {
      setMsg({ type: 'error', text: result.error ?? 'Failed to update participant.' });
    }
  }

  const activeCount = participants.filter((p) => !p.eliminated).length;

  return (
    <div className="flex flex-col gap-6">
      {msg?.type === 'error' && <ErrorMsg message={msg.text} />}
      {msg?.type === 'success' && <SuccessMsg message={msg.text} />}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{participants.length}</span> total
        </span>
        <span>
          <span className="font-semibold text-foreground">{activeCount}</span> active
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {participants.length - activeCount}
          </span>{' '}
          eliminated
        </span>
      </div>

      {/* Participants table */}
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Seed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No participants yet.
                  </TableCell>
                </TableRow>
              )}
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell>{p.seed ?? '-'}</TableCell>
                  <TableCell>
                    {p.eliminated ? (
                      <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                    ) : (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="size-7">
                            <MoreHorizontalIcon className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleEliminated(p)}>
                          {p.eliminated ? 'Mark Active' : 'Mark Eliminated'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add participant form */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add Participant</CardTitle>
          <CardDescription>Manually register a participant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-name" className="text-sm font-medium">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full Name"
                required
                disabled={adding}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-email" className="text-sm font-medium">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={adding}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="add-phone"
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="555-867-5309"
                required
                disabled={adding}
                className="h-9"
              />
            </div>
            <div className="sm:col-span-3">
              <Button
                type="submit"
                size="sm"
                disabled={adding || !addName || !addEmail || !addPhone}
                className="gap-1.5"
              >
                <PlusIcon className="size-4" />
                {adding ? 'Adding...' : 'Add Participant'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name" className="text-sm font-medium">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editSaving}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email" className="text-sm font-medium">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={editSaving}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={editSaving}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={editSaving || !editName || !editEmail || !editPhone}
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Participant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Rounds
// ---------------------------------------------------------------------------

const SEDER_NAMES = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Taharos'];

function RoundsTab({
  tournament,
  bracketData,
  onRefresh,
}: {
  tournament: Tournament | null;
  bracketData: BracketData;
  onRefresh: () => void;
}) {
  const [editTarget, setEditTarget] = useState<Round | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editSeder, setEditSeder] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  function toDatetimeLocal(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEdit(r: Round) {
    setEditTarget(r);
    setEditStart(toDatetimeLocal(r.start_date));
    setEditEnd(toDatetimeLocal(r.end_date));
    setEditSeder(r.special_seder ?? '');
    setEditStatus(r.status);
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    setMsg(null);
    try {
      const result = await updateRound(editTarget.id, {
        start_date: new Date(editStart).toISOString(),
        end_date: new Date(editEnd).toISOString(),
        special_seder: editSeder || undefined,
        status: editStatus as Round['status'],
      });
      if (result.success) {
        setMsg({ type: 'success', text: 'Round updated.' });
        setEditTarget(null);
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to update round.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error.' });
    } finally {
      setSaving(false);
    }
  }

  const rounds = bracketData?.rounds ?? [];

  if (!tournament) {
    return (
      <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No active tournament found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {msg?.type === 'error' && <ErrorMsg message={msg.text} />}
      {msg?.type === 'success' && <SuccessMsg message={msg.text} />}

      {rounds.length === 0 && (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No rounds yet. Generate the bracket from the Tournament tab.
        </div>
      )}

      {rounds.map((round) => (
        <Card key={round.id} className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Round {round.round_number}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(round.start_date).toLocaleDateString()} -{' '}
                  {new Date(round.end_date).toLocaleDateString()}
                  {round.special_seder && ` | Special Seder: ${round.special_seder}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={round.status} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => openEdit(round)}
                >
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {round.matchups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matchups.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {round.matchups.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground text-xs min-w-[60px]">
                      #{m.matchup_number}
                    </span>
                    <span className={m.winner_id === m.participant_1_id ? 'font-semibold text-primary' : ''}>
                      {m.participant1?.name ?? 'TBD'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {m.p1_total_score} vs {m.p2_total_score}
                    </span>
                    <span className={m.winner_id === m.participant_2_id ? 'font-semibold text-primary' : ''}>
                      {m.participant2?.name ?? 'BYE'}
                    </span>
                    {m.winner && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs ml-auto">
                        Winner: {m.winner.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit round dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Round {editTarget?.round_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-start" className="text-sm font-medium">Start Date</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                disabled={saving}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-end" className="text-sm font-medium">End Date</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                disabled={saving}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-seder" className="text-sm font-medium">Special Seder</Label>
              <select
                id="edit-seder"
                value={editSeder}
                onChange={(e) => setEditSeder(e.target.value)}
                disabled={saving}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="">None</option>
                {SEDER_NAMES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-status" className="text-sm font-medium">Status</Label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={saving}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Matchups
// ---------------------------------------------------------------------------

function MatchupsTab({
  bracketData,
  onRefresh,
}: {
  bracketData: BracketData;
  onRefresh: () => void;
}) {
  const rounds = bracketData?.rounds ?? [];
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [editingMatchupId, setEditingMatchupId] = useState<string | null>(null);
  const [p1Score, setP1Score] = useState('');
  const [p2Score, setP2Score] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (rounds.length > 0 && !selectedRoundId) {
      const active = rounds.find((r) => r.status === 'active');
      setSelectedRoundId(active?.id ?? rounds[rounds.length - 1].id);
    }
  }, [rounds, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const matchups = selectedRound?.matchups ?? [];

  function startEdit(m: EnrichedMatchup) {
    setEditingMatchupId(m.id);
    setP1Score(String(m.p1_total_score));
    setP2Score(String(m.p2_total_score));
    setWinnerId(m.winner_id ?? '');
  }

  function cancelEdit() {
    setEditingMatchupId(null);
    setP1Score('');
    setP2Score('');
    setWinnerId('');
  }

  async function handleSave(m: EnrichedMatchup) {
    setSaving(true);
    setMsg(null);
    try {
      const result = await updateMatchupScores(m.id, {
        p1_total_score: Number(p1Score),
        p2_total_score: Number(p2Score),
        winner_id: winnerId || null,
      });
      if (result.success) {
        setMsg({ type: 'success', text: 'Matchup updated.' });
        setEditingMatchupId(null);
        onRefresh();
      } else {
        setMsg({ type: 'error', text: result.error ?? 'Failed to update matchup.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unexpected error.' });
    } finally {
      setSaving(false);
    }
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No rounds yet. Generate the bracket first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {msg?.type === 'error' && <ErrorMsg message={msg.text} />}
      {msg?.type === 'success' && <SuccessMsg message={msg.text} />}

      {/* Round selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium whitespace-nowrap">Select Round:</Label>
        <select
          value={selectedRoundId}
          onChange={(e) => setSelectedRoundId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              Round {r.round_number} ({r.status})
            </option>
          ))}
        </select>
      </div>

      {matchups.length === 0 && (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No matchups for this round.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {matchups.map((m) => {
          const isEditing = editingMatchupId === m.id;
          return (
            <Card key={m.id} className="border-primary/20">
              <CardContent className="py-4">
                <div className="flex flex-col gap-3">
                  {/* Matchup header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Matchup #{m.matchup_number}
                      {m.special_masechta && ` | ${m.special_masechta}`}
                    </span>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => startEdit(m)}
                      >
                        Override Scores
                      </Button>
                    )}
                  </div>

                  {/* Participants and scores */}
                  {!isEditing ? (
                    <div className="grid grid-cols-3 gap-2 items-center text-sm">
                      <div className={`font-medium ${m.winner_id === m.participant_1_id ? 'text-primary' : ''}`}>
                        {m.participant1?.name ?? 'TBD'}
                      </div>
                      <div className="text-center text-muted-foreground">
                        <span className="font-semibold text-foreground">{m.p1_total_score}</span>
                        {' vs '}
                        <span className="font-semibold text-foreground">{m.p2_total_score}</span>
                      </div>
                      <div className={`font-medium text-right ${m.winner_id === m.participant_2_id ? 'text-primary' : ''}`}>
                        {m.participant2?.name ?? 'BYE'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-medium">
                            {m.participant1?.name ?? 'P1'} Score
                          </Label>
                          <Input
                            type="number"
                            value={p1Score}
                            onChange={(e) => setP1Score(e.target.value)}
                            min="0"
                            disabled={saving}
                            className="h-9"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-medium">
                            {m.participant2?.name ?? 'P2'} Score
                          </Label>
                          <Input
                            type="number"
                            value={p2Score}
                            onChange={(e) => setP2Score(e.target.value)}
                            min="0"
                            disabled={saving}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium">Winner Override</Label>
                        <select
                          value={winnerId}
                          onChange={(e) => setWinnerId(e.target.value)}
                          disabled={saving}
                          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                        >
                          <option value="">No winner set</option>
                          {m.participant1 && (
                            <option value={m.participant1.id}>{m.participant1.name}</option>
                          )}
                          {m.participant2 && (
                            <option value={m.participant2.id}>{m.participant2.name}</option>
                          )}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(m)}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {m.winner && !isEditing && (
                    <div className="flex">
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                        Winner: {m.winner.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Notifications
// ---------------------------------------------------------------------------

function NotificationsTab({ participants }: { participants: Participant[] }) {
  // We can only show a placeholder if no server action for notifications log exists.
  // In the future, wire up a getNotificationsLog action here.
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Notification log shows all emails and SMS messages sent to participants.
      </p>
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No notifications logged yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bracketData, setBracketData] = useState<BracketData>(null);
  const [loading, setLoading] = useState(true);

  // Auth check: require admin_auth in localStorage (set by /admin/login)
  useEffect(() => {
    const lsAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null;
    if (!lsAuth) {
      router.push('/admin/login');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        getActiveTournament(),
        getAllParticipants(),
      ]);
      setTournament(t);
      setParticipants(p);

      if (t) {
        const bd = await getTournamentBracket(t.id);
        setBracketData(bd);
      } else {
        setBracketData(null);
      }
      setAuthorized(true);
    } catch {
      // If data fetch fails entirely, redirect to login
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCwIcon className="size-6 animate-spin" />
          <p className="text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">
              Mishna Madness
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tournament && (
            <Badge className="bg-primary/15 text-primary border-primary/30 hidden sm:inline-flex">
              {tournament.name}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (typeof window !== 'undefined') localStorage.removeItem('admin_auth');
              router.push('/admin/login');
            }}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="tournament" className="w-full">
          <TabsList className="mb-6 w-full sm:w-auto flex-wrap h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="tournament" className="text-xs sm:text-sm">
              Tournament
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs sm:text-sm">
              Participants
              {participants.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-xs font-medium">
                  {participants.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rounds" className="text-xs sm:text-sm">
              Rounds
            </TabsTrigger>
            <TabsTrigger value="matchups" className="text-xs sm:text-sm">
              Matchups
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournament">
            <TournamentTab tournament={tournament} onRefresh={loadData} />
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantsTab participants={participants} onRefresh={loadData} />
          </TabsContent>

          <TabsContent value="rounds">
            <RoundsTab
              tournament={tournament}
              bracketData={bracketData}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="matchups">
            <MatchupsTab bracketData={bracketData} onRefresh={loadData} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab participants={participants} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
