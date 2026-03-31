"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  totalSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

export function CountdownTimer({
  totalSeconds,
  onComplete,
  autoStart = true,
  className = "",
  size = "md",
  showProgress = true,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

  const isLow = remaining <= 10;
  const isCritical = remaining <= 5;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`font-mono font-bold ${sizeClasses[size]} ${
          isCritical ? "text-red-600 animate-pulse" :
          isLow ? "text-amber-600" : "text-gray-700"
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      {showProgress && (
        <div className="h-1.5 w-20 rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical ? "bg-red-500" :
              isLow ? "bg-amber-500" : "bg-indigo-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
