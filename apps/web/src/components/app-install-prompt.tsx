"use client";

import { useEffect, useState } from "react";
import { X, Download, Smartphone, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAY_STORE_URL, APP_STORE_URL, PLAY_STORE_LIVE, APP_STORE_LIVE } from "@/lib/constants";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    // Check if banner was dismissed recently
    const dismissed = localStorage.getItem("install-banner-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Show banner after 5 seconds
    const timer = setTimeout(() => setShowBanner(true), 5000);

    // Listen for PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("install-banner-dismissed", Date.now().toString());
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:rounded-2xl sm:border dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={dismissBanner}
        className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600">
          <Download className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Get Prepfly App</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            {isIOS
              ? "Add to your home screen for the best experience"
              : "Install the app for offline practice and faster access"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {/* PWA Install (Chrome/Edge on Android/Desktop) */}
        {deferredPrompt && (
          <Button onClick={handleInstallPWA} size="sm" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Install App
          </Button>
        )}

        {/* iOS Safari instructions */}
        {isIOS && !deferredPrompt && (
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-300">
            <p className="font-medium">To install on iPhone:</p>
            <p className="mt-1">
              Tap the <strong>Share</strong> button (square with arrow) then tap <strong>&quot;Add to Home Screen&quot;</strong>
            </p>
          </div>
        )}

        {/* Play Store link */}
        {isAndroid && PLAY_STORE_LIVE && (
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Smartphone className="h-4 w-4" />
              Get on Google Play
            </Button>
          </a>
        )}

        {/* App Store link */}
        {isIOS && APP_STORE_LIVE && (
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Apple className="h-4 w-4" />
              Get on App Store
            </Button>
          </a>
        )}

        {/* Desktop — show PWA or coming soon */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <p className="text-center text-xs text-gray-400 dark:text-slate-500">
            Use Chrome or Edge for the installable app experience
          </p>
        )}
      </div>
    </div>
  );
}
