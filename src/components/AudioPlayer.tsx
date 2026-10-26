import { useState, useEffect, useRef } from "react";
import { RadioStation } from "../types";
import { Play, Pause, Volume2, VolumeX, Radio, Disc3 } from "lucide-react";
import Hls from "hls.js";
import { ExtendedRadioStation } from "../data/radioStations";

interface AudioPlayerProps {
  station: RadioStation | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export default function AudioPlayer({ 
  station, 
  isPlaying, 
  setIsPlaying,
  volume: externalVolume,
  onVolumeChange: externalOnVolumeChange,
  isMuted: externalIsMuted,
  onToggleMute: externalOnToggleMute
}: AudioPlayerProps) {
  const [internalVolume, setInternalVolume] = useState(0.85);
  const [internalIsMuted, setInternalIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const volume = externalVolume !== undefined ? externalVolume : internalVolume;
  const isMuted = externalIsMuted !== undefined ? externalIsMuted : internalIsMuted;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const lastUrlRef = useRef<string>("");
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Synchronize audio stream play/pause when station or isPlaying changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (!station) {
      lastUrlRef.current = "";
      playPromiseRef.current = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (e) {}
      setIsPlaying(false);
      setLoading(false);
      setStreamError(null);
      return;
    }

    const targetUrl = station.url_resolved || station.url;
    const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(targetUrl)}`;
    const isHls = targetUrl.toLowerCase().includes(".m3u8") || station.url.toLowerCase().includes(".m3u8");

    let isCancelled = false;

    if (isPlaying) {
      const startPlayback = async () => {
        if (typeof window !== "undefined" && typeof (window as any).__resumeMicContext === "function") {
          try {
            await (window as any).__resumeMicContext();
          } catch (e) {
            console.warn("[Audio Setup] Failed to resume Web Audio context before play:", e);
          }
        }

        if (isCancelled || !audioRef.current) return;

        const currentActiveUrl = isHls ? targetUrl : proxiedUrl;
        const isNewSource = lastUrlRef.current !== currentActiveUrl;
        if (isNewSource) {
          lastUrlRef.current = currentActiveUrl;
          setStreamError(null);
          setLoading(true);

          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }

          try {
            audioRef.current.pause();
          } catch (e) {}

          if (isHls) {
            if (audioRef.current.canPlayType("application/vnd.apple.mpegurl")) {
              audioRef.current.src = targetUrl;
              audioRef.current.load();
              try {
                await audioRef.current.play();
                if (!isCancelled) {
                  setLoading(false);
                  setStreamError(null);
                }
              } catch (err: any) {
                if (!isCancelled && err.name !== "AbortError") {
                  setErrorState();
                }
              }
            } else if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferSize: 0, 
                maxBufferLength: 2,
                liveDurationInfinity: true,
              });
              hlsRef.current = hls;
              
              hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                if (isCancelled || !audioRef.current) return;
                try {
                  await audioRef.current.play();
                  setLoading(false);
                  setStreamError(null);
                } catch (err: any) {
                  if (!isCancelled && err.name !== "AbortError") {
                    setErrorState();
                  }
                }
              });

              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                  console.warn(`HLS stream notice: ${data.details}`);
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    try {
                      hls.destroy();
                      hlsRef.current = null;
                      if (audioRef.current) {
                        audioRef.current.src = proxiedUrl;
                        audioRef.current.play().catch(() => setErrorState());
                      }
                    } catch (err) {
                      setErrorState();
                    }
                  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                  } else {
                    setErrorState();
                  }
                }
              });

              hls.loadSource(targetUrl);
              hls.attachMedia(audioRef.current);
            } else {
              audioRef.current.src = proxiedUrl;
              audioRef.current.load();
            }
          } else {
            audioRef.current.src = proxiedUrl;
            audioRef.current.load();
            try {
              const playPromise = audioRef.current.play();
              playPromiseRef.current = playPromise;
              await playPromise;

              if (isCancelled) return;
              if (playPromiseRef.current === playPromise) {
                setLoading(false);
                setStreamError(null);
              }
            } catch (err: any) {
              if (isCancelled) return;
              if (err.name === "AbortError" || err.message?.includes("interrupted")) {
                // Expected interruption during rapid user tuning
              } else {
                // Attempt direct connection if proxied attempt failed on https
                if (targetUrl.startsWith("https://") && audioRef.current) {
                  try {
                    audioRef.current.src = targetUrl;
                    await audioRef.current.play();
                    setLoading(false);
                    setStreamError(null);
                    return;
                  } catch (e2) {}
                }
                console.warn("Broadcast connection notice:", err.message || err);
                setErrorState();
              }
            }
          }
        }
      };

      startPlayback();
    } else {
      setLoading(false);
      playPromiseRef.current = null;
      lastUrlRef.current = "";
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        audioRef.current.pause();
      } catch (e) {}
    }

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [station, isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const setErrorState = () => {
    setLoading(false);
    setIsPlaying(false);
    setStreamError("Unable to connect to broadcast stream. Try another frequency or station.");
  };

  const handleMuteToggle = () => {
    if (externalOnToggleMute) {
      externalOnToggleMute();
    } else {
      setInternalIsMuted(!internalIsMuted);
    }
  };

  const handleVolumeSlide = (val: number) => {
    if (externalOnVolumeChange) {
      externalOnVolumeChange(val);
    } else {
      setInternalVolume(val);
      setInternalIsMuted(false);
    }
  };

  const ext = station as ExtendedRadioStation | null;
  const freqLabel = ext?.freqMhz ? `${ext.freqMhz.toFixed(1)} FM` : "94.7 FM";

  return (
    <div className="bg-[#170e07] border-t border-[#785829]/60 py-3 px-4 sm:px-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xl relative min-h-[72px] text-[#f6ebd7]">
      
      {/* Native HTML5 Audio */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onCanPlay={() => {
          setLoading(false);
          setStreamError(null);
        }}
        onWaiting={() => setLoading(true)}
        onError={() => {
          if (!isPlaying || !station || !audioRef.current) return;
          const error = audioRef.current.error;
          if (!error || error.code === 1) return;
          
          const currentSrc = audioRef.current.src || "";
          if (!currentSrc || !currentSrc.startsWith("http")) return;

          const fallbackProxied = `/api/proxy-stream?url=${encodeURIComponent(station.url)}`;
          if (currentSrc && !currentSrc.includes(encodeURIComponent(station.url))) {
            audioRef.current.src = fallbackProxied;
            audioRef.current.play().catch(() => setErrorState());
          } else {
            setErrorState();
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Left: Station info with vintage badge */}
      <div className="flex items-center gap-3.5 w-full md:w-1/3">
        {station ? (
          <>
            <div className="relative">
              <div className={`w-11 h-11 rounded-xl bg-[#24170e] border border-[#785829] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md ${isPlaying ? 'ring-1 ring-[#d4af37]/60' : ''}`}>
                {station.favicon ? (
                  <img
                    src={station.favicon}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const tgt = e.target as HTMLImageElement;
                      tgt.style.display = 'none';
                    }}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Radio className="w-5 h-5 text-[#d4af37]" />
                )}
              </div>
              {/* Dial On-Air Dot */}
              <div className="absolute -bottom-1 -right-1 bg-red-600 w-3.5 h-3.5 rounded-full border-2 border-[#170e07] flex items-center justify-center">
                <span className={`w-1.5 h-1.5 rounded-full bg-white ${isPlaying ? 'animate-ping' : ''}`} />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[#ffb84d] font-bold">
                  {freqLabel}
                </span>
                <span className="text-[10px] text-[#785829]">•</span>
                <span className="text-[10px] font-mono text-[#c4974f] uppercase truncate">
                  {station.countrycode || "WORLD"}
                </span>
              </div>
              <p className="font-serif font-bold text-xs sm:text-sm text-[#f5ebd7] truncate">
                {station.name}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5 text-[#8f692d]">
            <div className="w-10 h-10 rounded-xl border border-dashed border-[#5a3c18] flex items-center justify-center flex-shrink-0">
              <Disc3 className="w-5 h-5 text-[#6b4c24]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-serif font-bold text-[#c4974f]">Tuner Standby</span>
              <span className="text-[10px] text-[#805e2b]">Select any channel from above</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Main Vintage Play Button */}
      <div className="flex items-center justify-center gap-4 w-full md:w-1/3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!station}
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-[#1a0e05] transition-all shadow-lg border cursor-pointer active:scale-95 ${
            !station
              ? "bg-[#332214] text-[#6e4d2b] border-[#4a331c] cursor-not-allowed"
              : isPlaying
              ? "bg-gradient-to-b from-[#d4af37] to-[#996f0a] border-[#ffd68a] shadow-[0_0_12px_rgba(212,175,55,0.4)]"
              : "bg-gradient-to-b from-[#e6a13b] to-[#b37517] border-[#ffd68a] hover:brightness-110"
          }`}
          title={!station ? "No station loaded" : loading ? "Connecting frequency..." : isPlaying ? "Pause broadcast" : "Tune in & Play"}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-[#1a0e05]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          )}
        </button>

        {streamError && (
          <span className="text-[11px] text-red-400 font-sans truncate max-w-[200px]">
            {streamError}
          </span>
        )}
      </div>

      {/* Right: Master Volume Slider */}
      <div className="flex items-center justify-end gap-3 w-full md:w-1/3">
        <button
          onClick={handleMuteToggle}
          className="text-[#ffb84d] hover:text-[#fff0d6] transition-colors cursor-pointer"
          title={isMuted || volume === 0 ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeSlide(parseFloat(e.target.value))}
          className="w-24 accent-[#ff9800] h-1.5 bg-[#3a2617] rounded-lg cursor-pointer"
          title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>

    </div>
  );
}
