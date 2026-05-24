"use client";

import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

interface AudioRecorderProps {
  maxDuration: number; // seconds
  prepTime?: number; // preparation time before recording starts
  onRecordingComplete: (blob: Blob, url: string) => void;
  disabled?: boolean;
  autoStart?: boolean; // when true, starts recording automatically after autoStartDelay
  autoStartDelay?: number; // seconds to count down before auto-starting
}

export function AudioRecorder({
  maxDuration,
  prepTime = 0,
  onRecordingComplete,
  disabled,
  autoStart = false,
  autoStartDelay = 0,
}: AudioRecorderProps) {
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useAudioRecorder(maxDuration);

  const [prepCountdown, setPrepCountdown] = useState(prepTime);
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  // When blob is ready, notify parent
  useEffect(() => {
    if (audioBlob && audioUrl && !hasRecorded) {
      setHasRecorded(true);
      onRecordingComplete(audioBlob, audioUrl);
    }
  }, [audioBlob, audioUrl, hasRecorded, onRecordingComplete]);

  // Auto-start recording when triggered (e.g. after prompt audio ends)
  useEffect(() => {
    if (!autoStart || isRecording || audioUrl || isPreparing) return;
    if (autoStartDelay > 0) {
      setIsPreparing(true);
      setPrepCountdown(autoStartDelay);
      const interval = setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsPreparing(false);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleStart = async () => {
    if (prepTime > 0) {
      setIsPreparing(true);
      setPrepCountdown(prepTime);

      const interval = setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsPreparing(false);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      await startRecording();
    }
  };

  const handleReset = () => {
    resetRecording();
    setHasRecorded(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = maxDuration > 0 ? (recordingTime / maxDuration) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</div>
      )}

      {/* Preparation countdown */}
      {isPreparing && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <span className="text-3xl font-bold text-amber-600">{prepCountdown}</span>
          </div>
          <p className="text-sm font-medium text-amber-700">Preparing... Recording starts in {prepCountdown}s</p>
        </div>
      )}

      {/* Recording UI */}
      {!isPreparing && (
        <div className="flex flex-col items-center gap-4">
          {/* Waveform / Status indicator */}
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-500"
                    style={{
                      height: `${12 + Math.random() * 20}px`,
                      animation: "pulse 0.5s ease-in-out infinite",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Timer */}
            <div className="text-center">
              <p className={`text-2xl font-mono font-bold ${isRecording ? "text-red-600" : "text-gray-900 dark:text-slate-100"}`}>
                {formatTime(recordingTime)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isRecording ? `Recording... (max ${formatTime(maxDuration)})` :
                 audioUrl ? "Recording complete" : "Ready to record"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {isRecording && (
            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRecording && !audioUrl && (
              <Button
                onClick={handleStart}
                disabled={disabled}
                className="gap-2 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}

            {audioUrl && !isRecording && (
              <>
                <audio controls src={audioUrl} className="max-w-xs" />
                <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Re-record
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
