import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, History, Settings, LogOut, PieChart, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const navItems = [
    { path: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { path: "/portefeuille", label: "Portefeuille", icon: PieChart },
    { path: "/signaux", label: "Historique signaux", icon: History },
    { path: "/psychologie", label: "Psychologie", icon: Brain },
    { path: "/compte-trading", label: "Paramètres", icon: Settings },
  ];

  const handleLogout = async () => {
    await logout.mutateAsync();
    queryClient.clear();
    setLocation("/connexion");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar — desktop: left column; mobile: bottom tab bar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-lg">
            <Activity className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">Merced</h1>
            <p className="text-xs text-muted-foreground uppercase font-mono mt-1 tracking-widest">Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm ${
                    isActive
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-accent" : ""}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around px-1 py-2 safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-w-[52px] ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-medium leading-none mt-0.5 whitespace-nowrap">
                  {item.label.split(" ")[0]}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
