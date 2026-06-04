"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Gauge } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  defaultVoice?: string; // e.g. "Indian", "US"
  onLoadedMetadata?: (durationSec: number) => void;
  onError?: () => void;
  onEnded?: () => void;
  playOnce?: boolean; // if true: no seek, no replay after audio ends
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const VOICES = ["Indian", "Steven (US)", "Emma (UK)", "Olivia (AU)"];

function formatTime(sec: number): string {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerCustom({
  src,
  defaultVoice = "Indian",
  onLoadedMetadata,
  onError,
  onEnded,
  playOnce = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [voice, setVoice] = useState(defaultVoice);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false); // used when playOnce=true

  // In mock test (playOnce), auto-play when audio is ready — no play button is shown
  useEffect(() => {
    if (!playOnce) return;
    const audio = audioRef.current;
    if (!audio) return;
    const tryPlay = () => { audio.play().catch(() => {}); };
    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener("canplay", tryPlay, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playOnce]);

  // Sync audio element with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const togglePlay = () => {
    if (playOnce && hasPlayed) return; // can't replay
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => { /* ignore autoplay block */ });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (playOnce) return; // seeking disabled in play-once mode
    const audio = audioRef.current;
    if (!audio) return;
    const t = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); if (playOnce) setHasPlayed(true); onEnded?.(); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration || 0;
          setDuration(d);
          if (onLoadedMetadata && isFinite(d) && d > 0) onLoadedMetadata(d);
        }}
        onError={onError}
      />

      {/* Play-once "already played" banner */}
      {playOnce && hasPlayed && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <span>⚠</span>
          <span>Audio has been played. In the mock test, audio can only be played once.</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause — hidden in mock test (playOnce mode) */}
        {!playOnce && (
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-teal-500 text-teal-600 transition hover:bg-teal-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        )}

        {/* Seek bar / progress — interactive in practice, read-only in mock test */}
        <div className="flex flex-1 items-center gap-2">
          {playOnce ? (
            <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : (
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPct}
              onChange={handleSeek}
              className="flex-1 cursor-pointer accent-teal-500"
            />
          )}
          <span className="font-mono text-xs text-gray-600 whitespace-nowrap dark:text-slate-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Volume — hidden in mock test */}
        {!playOnce && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMuted(!muted)}
              className="rounded-full border border-teal-200 p-2 text-teal-600 hover:bg-teal-50"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume * 100}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value) / 100);
                setMuted(false);
              }}
              className="hidden w-16 cursor-pointer accent-teal-500 sm:block"
            />
          </div>
        )}

        {/* Playback speed — hidden in mock test (playOnce mode) */}
        {!playOnce && (
          <div className="relative">
            <button
              onClick={() => { setShowRateMenu(!showRateMenu); setShowVoiceMenu(false); }}
              className="flex items-center gap-1 rounded-full border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
            >
              <Gauge className="h-3.5 w-3.5" />
              {playbackRate}x
            </button>
            {showRateMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-24 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {PLAYBACK_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setPlaybackRate(r); setShowRateMenu(false); }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 ${
                      playbackRate === r ? "font-semibold text-teal-600" : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {r}x {playbackRate === r && "✓"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voice / accent — hidden in mock test */}
        {!playOnce && (
          <div className="relative">
            <button
              onClick={() => { setShowVoiceMenu(!showVoiceMenu); setShowRateMenu(false); }}
              className="flex items-center gap-1 rounded-full border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
            >
              {voice} ▾
            </button>
            {showVoiceMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {VOICES.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setVoice(v); setShowVoiceMenu(false); }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 ${
                      voice === v ? "font-semibold text-teal-600" : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {v} {voice === v && "✓"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
