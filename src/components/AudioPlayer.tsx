"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AudioUrls {
  sfx: string[];
  music: string;
}

interface AudioPlayerProps {
  audioUrls: AudioUrls | null;
  onFinished?: () => void;
  isPlaying?: boolean;
}

const BAR_COUNT = 40;

export default function AudioPlayer({
  audioUrls,
  onFinished,
  isPlaying: externalIsPlaying,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTrackLabel, setCurrentTrackLabel] = useState("");
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const barHeightsRef = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, () => Math.random() * 0.5 + 0.1)
  );

  // Build playlist from audioUrls, and hard-reset any previous playback
  // so audio from a prior round never bleeds into the new one.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    setIsPlaying(false);

    if (!audioUrls) {
      playlistRef.current = [];
      setTotalTracks(0);
      setCurrentTrackIndex(0);
      setHasFinished(false);
      setProgress(0);
      setCurrentTrackLabel("");
      return;
    }

    const playlist: string[] = [];
    if (audioUrls.sfx) playlist.push(...audioUrls.sfx);
    if (audioUrls.music) playlist.push(audioUrls.music);
    playlistRef.current = playlist;
    setTotalTracks(playlist.length);
    currentIndexRef.current = 0;
    setCurrentTrackIndex(0);
    setHasFinished(false);
    setProgress(0);
    updateLabel(0, audioUrls);
  }, [audioUrls]);

  // Stop playback when the component unmounts (phase transitions).
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  function updateLabel(index: number, urls: AudioUrls | null) {
    if (!urls) return;
    const sfxCount = urls.sfx?.length || 0;
    if (index < sfxCount) {
      setCurrentTrackLabel(`Playing SFX ${index + 1}/${sfxCount}...`);
    } else {
      setCurrentTrackLabel("Playing Music...");
    }
  }

  const playTrack = useCallback(
    (index: number) => {
      const playlist = playlistRef.current;
      if (index >= playlist.length) {
        setIsPlaying(false);
        setHasFinished(true);
        onFinished?.();
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }

      const audio = new Audio(playlist[index]);
      audioRef.current = audio;
      currentIndexRef.current = index;
      setCurrentTrackIndex(index);
      updateLabel(index, audioUrls);

      audio.addEventListener("ended", () => {
        playTrack(index + 1);
      });

      audio.addEventListener("error", () => {
        // Skip to next track on error
        playTrack(index + 1);
      });

      audio.play().catch(() => {
        // Autoplay blocked — user will click play
        setIsPlaying(false);
      });

      setIsPlaying(true);
    },
    [audioUrls, onFinished]
  );

  // Handle external play control
  useEffect(() => {
    if (externalIsPlaying === true && !isPlaying && !hasFinished) {
      playTrack(currentIndexRef.current);
    }
  }, [externalIsPlaying, isPlaying, hasFinished, playTrack]);

  // Update progress
  useEffect(() => {
    function tick() {
      const audio = audioRef.current;
      if (audio && audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
      // Animate bar heights when playing
      if (isPlaying) {
        barHeightsRef.current = barHeightsRef.current.map((h) => {
          const target = Math.random() * 0.8 + 0.15;
          return h + (target - h) * 0.15;
        });
      } else {
        barHeightsRef.current = barHeightsRef.current.map((h) => {
          return h + (0.1 - h) * 0.05;
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audioUrls) return;

    if (hasFinished) {
      // Restart from beginning
      setHasFinished(false);
      setProgress(0);
      currentIndexRef.current = 0;
      playTrack(0);
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.src) {
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else {
        playTrack(0);
      }
    }
  }

  function handleStartPlay() {
    if (!audioUrls) return;
    playTrack(0);
  }

  const noAudio = !audioUrls;

  return (
    <div className="glass-card p-6 w-full max-w-lg mx-auto">
      {/* Waveform visualization */}
      <div className="flex items-end justify-center gap-[2px] h-24 mb-4 px-2">
        {barHeightsRef.current.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-100"
            style={{
              height: `${h * 100}%`,
              background: isPlaying
                ? `linear-gradient(to top, var(--accent-cyan), var(--accent-amber))`
                : `rgba(255, 255, 255, 0.15)`,
              opacity: isPlaying ? 0.8 + Math.random() * 0.2 : 0.3,
              minWidth: "3px",
              maxWidth: "8px",
            }}
          />
        ))}
      </div>

      {/* Track label */}
      <div className="text-center mb-3">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {noAudio
            ? "Waiting for audio..."
            : hasFinished
            ? "Playback complete"
            : currentTrackLabel || "Ready to play"}
        </span>
        {totalTracks > 0 && !noAudio && (
          <span
            className="text-xs ml-2"
            style={{ color: "var(--text-secondary)" }}
          >
            ({currentTrackIndex + 1}/{totalTracks})
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(to right, var(--accent-cyan), var(--accent-amber))",
          }}
        />
      </div>

      {/* Play button */}
      <div className="flex justify-center">
        <button
          onClick={noAudio ? undefined : isPlaying || hasFinished || audioRef.current?.src ? togglePlay : handleStartPlay}
          disabled={noAudio}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          style={{
            background: noAudio
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, var(--accent-cyan), var(--accent-amber))",
            boxShadow: noAudio
              ? "none"
              : "0 0 30px rgba(0, 240, 255, 0.3)",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            // Pause icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
