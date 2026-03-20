'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUser } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export default function RegisterPage() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ status: 'idle' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: 'loading' });

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createUser(formData);
      if (result.success && result.user) {
        localStorage.setItem('userId', result.user.id);
        localStorage.setItem('userName', result.user.name);
        localStorage.setItem('userEmail', result.user.email);
        router.push('/dashboard');
      } else {
        setState({ status: 'error', message: result.error ?? 'Something went wrong. Please try again.' });
      }
    } catch {
      setState({ status: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary mt-2">Create Account</h1>
          <p className="text-muted-foreground text-sm">
            Sign up to join Mishna Madness tournaments.
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
                {state.status === 'loading' ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground px-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
