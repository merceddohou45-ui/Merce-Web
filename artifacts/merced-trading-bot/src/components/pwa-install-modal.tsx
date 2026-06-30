import { useState, useEffect, useCallback } from "react";
import { Activity, Download, Share, X, Smartphone, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Storage key for install state
const STORAGE_KEY = "merced_pwa_install_v2";

// How long to suppress the modal after clicking "Plus tard" (4 hours, not days)
const SNOOZE_MS = 4 * 60 * 60 * 1000;

function isInstalled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { installed?: boolean }).installed === true;
  } catch {
    return false;
  }
}

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { snoozedUntil?: number };
    return typeof data.snoozedUntil === "number" && Date.now() < data.snoozedUntil;
  } catch {
    return false;
  }
}

function markInstalled(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ installed: true }));
  } catch { /* storage unavailable */ }
}

function snooze(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ snoozedUntil: Date.now() + SNOOZE_MS }));
  } catch { /* storage unavailable */ }
}

type ModalState = "hidden" | "install" | "ios-guide";

export function PWAInstallModal() {
  const [state, setState] = useState<ModalState>("hidden");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as standalone app — never show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // In iframe (Replit preview) — skip install modal (can't install from iframe)
    if (window.self !== window.top) return;

    // Already permanently installed — never show
    if (isInstalled()) return;

    // Snoozed by user — wait until snooze expires
    if (isSnoozed()) return;

    // iOS Safari — show installation guide
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      const timer = setTimeout(() => setState("ios-guide"), 1500);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome — wait for beforeinstallprompt
    const handlePrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
      setState("install");
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);

    // appinstalled event — mark permanently and hide
    const handleInstalled = () => {
      markInstalled();
      setState("hidden");
    };
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        markInstalled();
        setState("hidden");
      } else {
        setInstalling(false);
      }
    } catch {
      setInstalling(false);
    }
  }, [prompt]);

  // "Plus tard" snoozes for 4 hours — modal will re-appear next session
  const handleLater = useCallback(() => {
    snooze();
    setState("hidden");
  }, []);

  if (state === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-accent/20 via-accent/5 to-transparent px-6 pt-6 pb-4">
          <button
            onClick={handleLater}
            aria-label="Plus tard"
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center shrink-0">
              <Activity className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Merced Trading Bot</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
                Application de trading MTB
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2">
          {state === "install" && (
            <>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Installez l'app pour recevoir des <strong className="text-foreground">signaux en temps réel</strong>, 
                accéder à vos données hors ligne et profiter d'une expérience native sur votre appareil.
              </p>

              <div className="flex gap-2 flex-col sm:flex-row">
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 h-11"
                >
                  {installing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Installation...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Installer l'application
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLater}
                  className="flex-1 sm:flex-none text-muted-foreground border-border h-11"
                >
                  Plus tard
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Gratuit · Compatible Android, iPhone et Desktop
              </p>
            </>
          )}

          {state === "ios-guide" && (
            <>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Ajoutez MTB sur votre écran d'accueil pour recevoir des signaux en temps réel et profiter d'une expérience native.
              </p>

              <div className="space-y-3 mb-5">
                <Step n={1} icon={<Share className="h-4 w-4 text-accent" />}>
                  Appuyez sur le bouton <strong>Partager</strong>{" "}
                  <span className="text-muted-foreground">(icône en bas de Safari)</span>
                </Step>
                <Step n={2} icon={<Smartphone className="h-4 w-4 text-accent" />}>
                  Faites défiler et touchez <strong>« Sur l'écran d'accueil »</strong>
                </Step>
                <Step n={3} icon={<ArrowDown className="h-4 w-4 text-accent" />}>
                  Appuyez sur <strong>Ajouter</strong> en haut à droite
                </Step>
              </div>

              <Button
                variant="outline"
                onClick={handleLater}
                className="w-full text-muted-foreground border-border h-11"
              >
                Compris, peut-être plus tard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border/50">
      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-xs font-bold text-accent">
        {n}
      </div>
      <div className="flex items-center gap-2 flex-1 text-sm">
        {icon}
        <span className="text-muted-foreground leading-snug">{children}</span>
      </div>
    </div>
  );
}
