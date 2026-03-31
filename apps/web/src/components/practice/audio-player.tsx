"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({ src, autoPlay = false, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); onEnded?.(); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnd);

    if (autoPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnd);
    };
  }, [src, autoPlay, onEnded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
    setPlaying(true);
  };

  const changeSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const currentIdx = SPEEDS.indexOf(speed);
    const nextSpeed = SPEEDS[(currentIdx + 1) % SPEEDS.length];
    audio.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div
            className="h-2 cursor-pointer rounded-full bg-gray-200"
            onClick={seekTo}
          >
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed */}
        <button
          onClick={changeSpeed}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
        >
          {speed}x
        </button>

        {/* Restart */}
        <button
          onClick={restart}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
