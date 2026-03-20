'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/dashboard', label: 'Submit Scores' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

// Deduplicate for rendering — Dashboard and Submit Scores both go to /dashboard
// so we keep distinct labels pointing to the right routes:
const PRIMARY_NAV = [
  { href: '/', label: 'Home' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/dashboard', label: 'Submit Scores' },
  { href: '/dashboard', label: 'Dashboard' },
];

function NavLink({
  href,
  label,
  currentPath,
  onClick,
}: {
  href: string;
  label: string;
  currentPath: string;
  onClick?: () => void;
}) {
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'text-sm font-medium transition-colors px-1 py-0.5 rounded',
        isActive
          ? 'text-primary font-semibold underline underline-offset-4 decoration-primary/60'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
          aria-label="Mishna Madness home"
        >
          <span className="text-xl leading-none">🏆</span>
          <span className="font-bold text-primary text-base sm:text-lg tracking-tight group-hover:opacity-80 transition-opacity">
            Mishna Madness
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5" aria-label="Main navigation">
          {PRIMARY_NAV.map(({ href, label }) => (
            <NavLink
              key={label}
              href={href}
              label={label}
              currentPath={pathname}
            />
          ))}
        </nav>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="h-9 w-9"
                />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>

            <SheetContent side="right" className="w-64 pt-10">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle className="flex items-center gap-2 text-primary">
                  <span>🏆</span>
                  <span>Mishna Madness</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {PRIMARY_NAV.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={[
                      'flex items-center px-3 py-3 rounded-md text-sm font-medium transition-colors min-h-[44px]',
                      pathname === href || (href !== '/' && pathname.startsWith(href))
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default Header;
