import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Bienvenue from "@/pages/bienvenue";
import Inscription from "@/pages/inscription";
import Connexion from "@/pages/connexion";
import ComptéTrading from "@/pages/compte-trading";
import Dashboard from "@/pages/dashboard";
import Signals from "@/pages/signals";
import Portfolio from "@/pages/portfolio";
import Psychology from "@/pages/psychology";
import { Layout } from "@/components/layout";
import { PWAInstallModal } from "@/components/pwa-install-modal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Auth pages — no layout wrapper */}
      <Route path="/" component={Bienvenue} />
      <Route path="/inscription" component={Inscription} />
      <Route path="/connexion" component={Connexion} />
      <Route path="/compte-trading" component={ComptéTrading} />

      {/* App pages — with nav layout */}
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/signaux">
        <Layout>
          <Signals />
        </Layout>
      </Route>
      <Route path="/portefeuille">
        <Layout>
          <Portfolio />
        </Layout>
      </Route>
      <Route path="/psychologie">
        <Layout>
          <Psychology />
        </Layout>
      </Route>

      {/* Legacy paths kept alive */}
      <Route path="/signals">
        <Redirect to="/signaux" />
      </Route>
      <Route path="/portfolio">
        <Redirect to="/portefeuille" />
      </Route>
      <Route path="/psychology">
        <Redirect to="/psychologie" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
          <Router />
          <PWAInstallModal />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
