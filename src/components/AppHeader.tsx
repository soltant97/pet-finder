import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, PawPrint, Settings, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to={session ? "/oversikt" : "/"} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">DjurHittaren</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/borttappade"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            activeProps={{ className: "text-foreground" }}
          >
            Borttappade djur
          </Link>
          {ready && session && (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Notiser">
                <Link to="/notiser">
                  <Bell />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Konto">
                    <User />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profil"><User /> Profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/installningar"><Settings /> Inställningar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut /> Logga ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {ready && !session && (
            <Button asChild size="sm">
              <Link to="/auth">Logga in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PageShell({ title, subtitle, children, back }: { title: string; subtitle?: string; children: React.ReactNode; back?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      {back}
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </main>
  );
}
