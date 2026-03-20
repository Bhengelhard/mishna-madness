'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerParticipant } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RegistrationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; name: string }
  | { status: 'error'; message: string };

export default function RegisterPage() {
  const router = useRouter();
  const [state, setState] = useState<RegistrationState>({ status: 'idle' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: 'loading' });

    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();

    try {
      const result = await registerParticipant(formData);
      if (result.success && result.participant) {
        // Auto-login: store participant info and redirect to dashboard
        localStorage.setItem('participantId', result.participant.id);
        localStorage.setItem('participantName', result.participant.name);
        localStorage.setItem('participantEmail', result.participant.email);
        setState({ status: 'success', name });
        router.push('/dashboard');
      } else {
        setState({ status: 'error', message: result.error ?? 'Something went wrong. Please try again.' });
      }
    } catch {
      setState({ status: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  if (state.status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-md border-primary/20">
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl">🎉</span>
            <h2 className="text-2xl font-bold text-foreground">You are in!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Welcome to Mishna Madness, <span className="font-semibold text-foreground">{state.name}</span>!
              You will receive an email with matchup details and your assigned Masechta once the tournament begins.
              Keep an eye on your inbox and get ready to learn.
            </p>
            <div className="flex flex-col gap-2 w-full pt-2">
              <Button render={<Link href="/login" />} size="lg" className="w-full min-h-[44px]">
                Go to My Dashboard
              </Button>
              <Button render={<Link href="/" />} variant="outline" size="lg" className="w-full min-h-[44px]">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary mt-2">Register</h1>
          <p className="text-muted-foreground text-sm">
            Join the Mishna Madness tournament. Spots are limited.
          </p>
        </div>

        <Card className="shadow-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Details</CardTitle>
            <CardDescription>All fields are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Yisroel Goldberg"
                  autoComplete="name"
                  required
                  disabled={state.status === 'loading'}
                  className="h-11 text-base"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={state.status === 'loading'}
                  className="h-11 text-base"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="555-867-5309"
                  autoComplete="tel"
                  required
                  disabled={state.status === 'loading'}
                  className="h-11 text-base"
                />
              </div>

              {/* Error message */}
              {state.status === 'error' && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {state.message}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[48px] text-base font-semibold mt-1"
                disabled={state.status === 'loading'}
              >
                {state.status === 'loading' ? 'Registering...' : 'Register Now'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground px-4">
          Already registered?{' '}
          <Link href="/login" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
