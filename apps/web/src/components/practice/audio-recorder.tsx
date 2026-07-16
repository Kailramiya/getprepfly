"use client";

import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw, FastForward } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface AudioRecorderProps {
  maxDuration: number; // seconds
  prepTime?: number; // preparation time before recording starts
  onRecordingComplete: (blob: Blob, url: string) => void;
  onRecordingStarted?: () => void;
  disabled?: boolean;
  autoStart?: boolean; // when true, starts recording automatically after autoStartDelay
  autoStartDelay?: number; // seconds to count down before auto-starting
  hideReRecord?: boolean; // hides the re-record option
  recorderRef?: React.MutableRefObject<{ stopRecording: () => void } | null>;
}

export function AudioRecorder({
  maxDuration,
  prepTime = 0,
  onRecordingComplete,
  onRecordingStarted,
  disabled,
  autoStart = false,
  autoStartDelay = 0,
  hideReRecord = false,
  recorderRef,
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (recorderRef) {
      recorderRef.current = {
        stopRecording: () => {
          if (isRecording) stopRecording();
        }
      };
    }
  }, [recorderRef, isRecording, stopRecording]);

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
            timerRef.current = null;
            setIsPreparing(false);
            startRecording().then(() => onRecordingStarted?.());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = interval;
      return () => {
        clearInterval(interval);
        timerRef.current = null;
      };
    } else {
      startRecording().then(() => onRecordingStarted?.());
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
            timerRef.current = null;
            setIsPreparing(false);
            startRecording().then(() => onRecordingStarted?.());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = interval;
    } else {
      await startRecording();
      onRecordingStarted?.();
    }
  };

  const skipPrepAndStart = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPreparing(false);
    setPrepCountdown(0);
    startRecording().then(() => onRecordingStarted?.());
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

  const isPermissionDenied = error?.includes("access denied") || error?.includes("access blocked");
  const isMicNotFound = error?.includes("No microphone");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {error && (
        <div className={`mb-3 rounded-lg p-3 text-sm ${
          isPermissionDenied
            ? "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
            : "border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
        }`}>
          <p className={`font-semibold mb-1 ${
            isPermissionDenied ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
          }`}>
            {isPermissionDenied ? "🎤 Microphone Access Blocked" : isMicNotFound ? "🎤 No Microphone Found" : "Recording Error"}
          </p>
          <p className={isPermissionDenied ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"}>
            {error}
          </p>
          {isPermissionDenied && (
            <div className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-300">
              <p className="font-medium">How to fix:</p>
              <p>• <strong>Chrome/Edge:</strong> Click the 🔒 lock icon in the address bar → Microphone → Allow</p>
              <p>• <strong>Firefox:</strong> Click the camera icon in the address bar → Allow microphone</p>
              <p>• <strong>Safari:</strong> Safari menu → Settings for this website → Microphone → Allow</p>
              <p className="mt-1">After allowing access, refresh the page and try again.</p>
            </div>
          )}
          {isMicNotFound && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
              Please connect a microphone or headset to your device and try again.
            </p>
          )}
        </div>
      )}

      {/* Preparation countdown */}
      {isPreparing && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <span className="text-3xl font-bold text-amber-600">{prepCountdown}</span>
          </div>
          <p className="text-sm font-medium text-amber-700">Preparing... Recording starts in {prepCountdown}s</p>
          <Button
            onClick={skipPrepAndStart}
            variant="outline"
            className="mt-2 gap-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
          >
            <FastForward className="h-4 w-4" />
            Skip & Start Recording
          </Button>
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
                {!hideReRecord && (
                  <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Re-record
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
