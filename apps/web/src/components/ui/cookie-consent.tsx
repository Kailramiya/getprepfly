"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (value: "accepted" | "declined") => {
    localStorage.setItem("cookie-consent", value);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-out animate-in slide-in-from-bottom-full">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">We value your privacy</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
          </p>
        </div>
        
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleConsent("declined")}
            className="w-full border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white sm:w-auto"
          >
            Decline
          </Button>
          <Button 
            size="sm"
            onClick={() => handleConsent("accepted")}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-500 sm:w-auto shadow-[0_0_15px_rgba(79,70,229,0.4)]"
          >
            Accept All
          </Button>
          <button 
            onClick={() => handleConsent("declined")}
            className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
