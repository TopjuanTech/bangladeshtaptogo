"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { dashboardNavItems, getCurrentNavItem } from "@/lib/dashboard-nav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const current = useMemo(() => getCurrentNavItem(pathname), [pathname]);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed out.");
    } catch {
      toast.error("Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="bg-card border-r p-4 md:sticky md:top-0 md:h-screen md:w-64 md:p-5">
          <div className="space-y-1.5 border-b pb-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              TapTapToGo
            </p>
            <p className="text-lg font-semibold">Operations Console</p>
          </div>

          <nav className="mt-4 hidden space-y-1 md:block">
            {dashboardNavItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background/95 border-b px-4 py-3 backdrop-blur sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs">
                  TapTapToGo / {current.title}
                </p>
                <h2 className="text-base font-semibold">
                  {current.description}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing Out..." : "Sign Out"}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto md:hidden">
              {dashboardNavItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      buttonVariants({
                        variant: active ? "default" : "outline",
                        size: "sm",
                      }),
                      "shrink-0",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
