"use client";

import { useEffect } from "react";

export function useContentProtection() {
  useEffect(() => {
    const ALLOWED_INPUTS = ["INPUT", "TEXTAREA", "SELECT"];

    const isTypingTarget = (el: Element | null) =>
      el && (ALLOWED_INPUTS.includes(el.tagName) || (el as HTMLElement).isContentEditable);

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (!isTypingTarget(e.target as Element)) e.preventDefault();
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const blocked = ["c", "a", "s", "u", "p", "i", "j"];
      if (blocked.includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Block F12 dev tools
      if (e.key === "F12") {
        e.preventDefault();
      }
    };

    // Block copy/cut events on non-input elements
    const handleCopy = (e: ClipboardEvent) => {
      if (!isTypingTarget(e.target as Element)) e.preventDefault();
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!isTypingTarget(e.target as Element)) e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
    };
  }, []);
}
