'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getParticipantByEmail } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({ status: 'idle' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: 'loading' });

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();

    try {
      const participant = await getParticipantByEmail(email);

      if (!participant) {
        setState({
          status: 'error',
          message: 'No account found with that email. Please check your address or register first.',
        });
        return;
      }

      localStorage.setItem('participantId', participant.id);
      localStorage.setItem('participantName', participant.name);
      localStorage.setItem('participantEmail', participant.email);

      router.push('/dashboard');
    } catch {
      setState({ status: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
          <div className="mt-2 space-y-1">
            <span className="text-4xl block">👋</span>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email to access your dashboard.
            </p>
          </div>
        </div>

        <Card className="shadow-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>
              No password needed. We look you up by email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

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
                  autoFocus
                  required
                  disabled={state.status === 'loading'}
                  className="h-11 text-base"
                />
              </div>

              {state.status === 'error' && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {state.message}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[48px] text-base font-semibold"
                disabled={state.status === 'loading'}
              >
                {state.status === 'loading' ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Not registered yet?{' '}
          <Link href="/register" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
