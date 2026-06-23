import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client-react";

export default function Connexion() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login.mutateAsync({ data: { email, password } });
      if (user.hasAccount) {
        setLocation("/dashboard");
      } else {
        setLocation("/compte-trading");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Email ou mot de passe incorrect.";
      toast({ variant: "destructive", title: "Connexion échouée", description: msg });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-background pointer-events-none" />

      <div className="relative flex flex-col flex-1 px-6 py-safe-top max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center pt-6 mb-8">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Retour</span>
          </button>
        </div>

        {/* Icon + Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 w-fit mb-5">
            <Activity className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Se connecter</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Accédez à votre compte depuis n'importe quel appareil.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Adresse Gmail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="votre@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={login.isPending}
            className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl mt-2 shadow-lg shadow-accent/20"
          >
            {login.isPending ? (
              <Activity className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {login.isPending ? "Connexion en cours…" : "Se connecter"}
          </Button>
        </motion.form>

        {/* Register link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => setLocation("/inscription")}
              className="text-accent hover:underline font-medium"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
