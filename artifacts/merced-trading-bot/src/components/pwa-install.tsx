import { useState, useEffect } from "react";
import { Download, Share, X, Info } from "lucide-react";
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

type InstallState =
  | "hidden"
  | "ready"
  | "ios-guide"
  | "already-installed"
  | "iframe-blocked";

export function PWAInstallButton() {
  const [state, setState] = useState<InstallState>("hidden");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setState("already-installed");
      return;
    }

    // In iframe (Replit preview, etc.)
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      setState("iframe-blocked");
      return;
    }

    // iOS / Safari
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      setState("ios-guide");
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
      setState("ready");
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setState("already-installed");
      setPrompt(null);
    }
  };

  if (dismissed || state === "already-installed" || state === "hidden") return null;

  if (state === "iframe-blocked") {
    return (
      <div className="mx-3 mb-3 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
        <span>
          Le bouton d'installation n'est pas disponible dans cet aperçu. Ouvrez l'app directement dans Chrome ou Safari pour l'installer.
        </span>
      </div>
    );
  }

  if (state === "ios-guide") {
    if (showIosGuide) {
      return (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-semibold text-foreground">Installer sur iPhone / iPad</span>
            <button onClick={() => setDismissed(true)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ol className="space-y-1 text-muted-foreground">
            <li>1. Appuyez sur le bouton <strong>Partager</strong> <Share className="inline h-3 w-3" /></li>
            <li>2. Faites défiler et choisissez <strong>"Sur l'écran d'accueil"</strong></li>
            <li>3. Appuyez sur <strong>Ajouter</strong></li>
          </ol>
        </div>
      );
    }
    return (
      <div className="px-3 mb-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-2 border-accent/30 text-accent hover:bg-accent/10"
          onClick={() => setShowIosGuide(true)}
        >
          <Share className="h-3.5 w-3.5" />
          Installer sur l'écran d'accueil
        </Button>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <div className="px-3 mb-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-2 border-accent/30 text-accent hover:bg-accent/10"
          onClick={handleInstall}
        >
          <Download className="h-3.5 w-3.5" />
          Installer l'application
        </Button>
      </div>
    );
  }

  return null;
}
