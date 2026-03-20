'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminLogin } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await adminLogin(password);
      if (result.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_auth', 'true');
        }
        router.push('/admin');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-1">
            <span>🏆</span>
            <span>Mishna Madness</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin password to continue.
          </p>
        </div>

        <Card className="shadow-md border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription>Admin credentials required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11 text-base"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[48px] text-base font-semibold mt-1"
                disabled={loading || !password}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/"
            className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
