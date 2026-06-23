import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@workspace/api-client-react";

export default function Inscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const register = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Erreur", description: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    try {
      const user = await register.mutateAsync({ data: { email, password } });
      if (user.hasAccount) {
        setLocation("/dashboard");
      } else {
        setLocation("/compte-trading");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Une erreur est survenue.";
      toast({ variant: "destructive", title: "Erreur d'inscription", description: msg });
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
          <h1 className="text-3xl font-bold tracking-tight">Créer un compte</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Commencez à recevoir des signaux de trading en temps réel.
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
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl"
                autoComplete="new-password"
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

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm"
                type={showPwd ? "text" : "password"}
                placeholder="Répétez votre mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={register.isPending}
            className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl mt-2 shadow-lg shadow-accent/20"
          >
            {register.isPending ? (
              <Activity className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {register.isPending ? "Création en cours…" : "Créer mon compte"}
          </Button>
        </motion.form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <button
              type="button"
              onClick={() => setLocation("/connexion")}
              className="text-accent hover:underline font-medium"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
