import React, { useState, useEffect } from "react";
import { RadioStation } from "../types";
import { ExtendedRadioStation, VINTAGE_PRESETS } from "../data/radioStations";
import { 
  Play, Pause, Volume2, VolumeX, RotateCw, Radio, 
  ChevronLeft, ChevronRight, Newspaper, Music, Sparkles, Globe2, Disc
} from "lucide-react";

interface ClassicRadioCabinetProps {
  activeStation: RadioStation | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectStation: (station: RadioStation) => void;
  stations: ExtendedRadioStation[];
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isTranslating: boolean;
  onToggleTranslate: () => void;
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;
  supportedLanguages: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

export default function ClassicRadioCabinet({
  activeStation,
  isPlaying,
  onTogglePlay,
  onSelectStation,
  stations,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  isTranslating,
  onToggleTranslate,
  targetLanguage,
  onTargetLanguageChange,
  supportedLanguages,
  activeCategory,
  onCategoryChange,
}: ClassicRadioCabinetProps) {
  // Dial frequency: default to active station's frequency or 98.0 FM
  const currentFreq = (activeStation as ExtendedRadioStation)?.freqMhz || 94.7;
  const [dialPos, setDialPos] = useState<number>(currentFreq);

  // Sync dial position when active station changes
  useEffect(() => {
    if (activeStation) {
      const ext = activeStation as ExtendedRadioStation;
      if (ext.freqMhz) {
        setDialPos(ext.freqMhz);
      }
    }
  }, [activeStation]);

  // Frequency range: 88.0 MHz to 108.0 MHz
  const minFreq = 88.0;
  const maxFreq = 108.0;
  const needlePercent = Math.min(100, Math.max(0, ((dialPos - minFreq) / (maxFreq - minFreq)) * 100));

  // Tune to closest station when user moves the dial
  const handleDialChange = (newFreq: number) => {
    setDialPos(newFreq);
    // Find closest station
    let closest: ExtendedRadioStation | null = null;
    let minDiff = 0.8; // threshold in MHz
    for (const st of stations) {
      const diff = Math.abs((st.freqMhz || 98.0) - newFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = st;
      }
    }
    if (closest && closest.stationuuid !== activeStation?.stationuuid) {
      onSelectStation(closest);
    }
  };

  // Step tune up or down
  const handleStepTune = (delta: number) => {
    const currentIndex = stations.findIndex(s => s.stationuuid === activeStation?.stationuuid);
    if (currentIndex >= 0) {
      let nextIndex = currentIndex + delta;
      if (nextIndex < 0) nextIndex = stations.length - 1;
      if (nextIndex >= stations.length) nextIndex = 0;
      onSelectStation(stations[nextIndex]);
    } else if (stations.length > 0) {
      onSelectStation(stations[0]);
    }
  };

  // Auto scan: pick a random or next station
  const handleScan = () => {
    if (stations.length === 0) return;
    const randomIndex = Math.floor(Math.random() * stations.length);
    onSelectStation(stations[randomIndex]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl radio-wood-cabinet p-4 sm:p-7 md:p-9 text-[#f6ebd7] select-none transition-all duration-300">
      
      {/* ======================================================== */}
      {/* 1. TOP CROWN & BRASS NAMEPLATE */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-[#785829]/50">
        
        {/* Vintage Brand Plaque */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4af37] via-[#aa820a] to-[#5a3c18] p-[2px] shadow-lg flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#1c120a] flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#d4af37]" />
            </div>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-black tracking-widest text-[#f5ebd7] drop-shadow-md">
              AMOGH BRODCASTS
            </h1>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#c4974f] font-mono font-medium">
              WORLD RECEIVER • MODEL 1974
            </p>
          </div>
        </div>

        {/* Vintage Status Indicators */}
        <div className="flex items-center gap-4 bg-[#1a110a]/80 px-4 py-2 rounded-xl border border-[#785829]/60 shadow-inner">
          
          {/* Power / On Air Indicator Lamp */}
          <div className="flex items-center gap-2">
            <span 
              className={`w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm transition-all duration-300 ${
                isPlaying 
                  ? "bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" 
                  : "bg-[#451e18]"
              }`} 
            />
            <span className="text-[10px] font-mono tracking-wider text-[#d4af37] uppercase font-bold">
              {isPlaying ? "ON AIR" : "STANDBY"}
            </span>
          </div>

          <span className="text-[#785829]">•</span>

          {/* Vacuum Tube Interpreter Lamp */}
          <div className="flex items-center gap-2">
            <span 
              className={`w-3 h-3 rounded-full border border-black/40 transition-all duration-300 ${
                isTranslating 
                  ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping" 
                  : "bg-[#332211]"
              }`} 
            />
            <span className="text-[10px] font-mono tracking-wider text-[#d4af37] uppercase">
              AI TUBE
            </span>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. THE ANALOG DIAL WINDOW & VU METER (Main Display) */}
      {/* ======================================================== */}
      <div className="mt-5 rounded-2xl radio-dial-glass p-4 sm:p-6 relative overflow-hidden">
        
        {/* Subtle glass reflection sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          
          {/* Frequency & Station Readout Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#785829]/30 pb-3">
            
            <div className="overflow-hidden">
              <span className="text-[10px] tracking-widest text-[#c4974f] font-mono uppercase block">
                TUNED FREQUENCY
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#ffb84d] tracking-tight drop-shadow-[0_0_8px_rgba(255,184,77,0.4)]">
                  {dialPos.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-[#c4974f] font-semibold">MHz FM</span>
                <span className="text-xs text-[#8a6839] font-mono">/ {(dialPos * 9.5).toFixed(0)} kHz AM</span>
              </div>
            </div>

            {/* Current Station Title */}
            <div className="text-left sm:text-right overflow-hidden flex-1 sm:max-w-md">
              <h2 className="font-serif font-bold text-sm sm:text-base text-[#fff3db] truncate drop-shadow">
                {activeStation ? activeStation.name : "Tuning airwaves..."}
              </h2>
              <p className="text-[11px] text-[#c4974f] truncate font-sans">
                {activeStation ? `${activeStation.state || activeStation.country} • ${activeStation.tags?.split(",")[0] || "Broadcasting"}` : "Select a station or dial frequency"}
              </p>
            </div>

            {/* Vintage Analog Signal VU Meter */}
            <div className="w-28 h-12 rounded-lg bg-[#140b05] border border-[#6d4d23] p-1.5 flex flex-col justify-between shadow-inner shrink-0 self-start sm:self-auto">
              <div className="flex justify-between items-center text-[8px] font-mono text-[#b38644] px-1">
                <span>SIGNAL</span>
                <span>TUNING</span>
              </div>
              {/* VU Needle track */}
              <div className="relative w-full h-4 bg-[#0a0502] rounded overflow-hidden flex items-end px-1 border border-[#3d2711]">
                <div 
                  className="w-1 bg-red-500 rounded-t h-full transition-all duration-150 drop-shadow-[0_0_4px_#ef4444]"
                  style={{
                    marginLeft: isPlaying ? `${Math.min(92, Math.max(20, Math.floor(volume * 80 + Math.random() * 15)))}%` : "8%",
                  }}
                />
              </div>
              <div className="flex justify-between text-[7px] font-mono text-[#805e2b] px-0.5">
                <span>0</span>
                <span>3</span>
                <span>5</span>
                <span>7</span>
                <span>+3dB</span>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* THE ANALOG SCALE SLIDER & RED NEEDLE */}
          {/* ======================================================== */}
          <div className="py-2">
            
            {/* FM Scale Markers */}
            <div className="flex justify-between items-center text-[11px] font-mono font-bold text-[#ffae34] tracking-wider px-2">
              <span>88</span>
              <span>90</span>
              <span>92</span>
              <span>94</span>
              <span>96</span>
              <span>98</span>
              <span>100</span>
              <span>102</span>
              <span>104</span>
              <span>106</span>
              <span>108</span>
            </div>

            {/* Dial scale markings line */}
            <div className="relative my-2 h-7 bg-[#120904]/90 rounded-md border border-[#5a3c18] flex items-center px-1 overflow-hidden shadow-inner cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                const targetF = minFreq + pct * (maxFreq - minFreq);
                handleDialChange(Math.round(targetF * 10) / 10);
              }}
            >
              {/* Scale Tick Marks */}
              <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none opacity-60">
                {Array.from({ length: 41 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-[1px] bg-[#c4974f] ${
                      i % 4 === 0 ? "h-5 bg-[#ffb84d]" : i % 2 === 0 ? "h-3" : "h-1.5 opacity-50"
                    }`}
                  />
                ))}
              </div>

              {/* Station Markers on Scale */}
              {stations.slice(0, 14).map((s) => {
                const sPct = (( (s.freqMhz || 98.0) - minFreq) / (maxFreq - minFreq)) * 100;
                return (
                  <div
                    key={s.stationuuid}
                    style={{ left: `${sPct}%` }}
                    className="absolute top-0 bottom-0 w-1 flex flex-col items-center justify-start pointer-events-none"
                    title={`${s.name} (${s.freqMhz} MHz)`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb84d]/60 mt-0.5" />
                  </div>
                );
              })}

              {/* Glowing Red Frequency Needle */}
              <div
                className="absolute top-0 bottom-0 w-[3px] bg-red-500 shadow-[0_0_10px_#ef4444] transition-all duration-200 pointer-events-none z-20 flex flex-col items-center justify-between"
                style={{ left: `${needlePercent}%` }}
              >
                <div className="w-2.5 h-1.5 bg-red-400 rounded-b shadow" />
                <div className="w-2.5 h-1.5 bg-red-400 rounded-t shadow" />
              </div>
            </div>

            {/* AM Scale Markers */}
            <div className="flex justify-between items-center text-[9px] font-mono text-[#a37c44] px-2">
              <span>540</span>
              <span>600</span>
              <span>700</span>
              <span>800</span>
              <span>1000</span>
              <span>1200</span>
              <span>1400</span>
              <span>1600 kHz</span>
            </div>

            {/* Slider track for smooth finger/mouse dragging */}
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[9px] font-mono text-[#c4974f] uppercase tracking-wider shrink-0">
                TUNE SLIDER
              </span>
              <input
                type="range"
                min={minFreq}
                max={maxFreq}
                step="0.1"
                value={dialPos}
                onChange={(e) => handleDialChange(parseFloat(e.target.value))}
                className="w-full accent-[#ff9800] h-1.5 bg-[#2b1b0d] rounded-lg cursor-pointer"
                aria-label="Radio Frequency Slider"
              />
            </div>

          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. QUICK MECHANICAL PRESET BUTTONS (ZENITH / PIONEER STYLE) */}
      {/* ======================================================== */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#c4974f]">
            MECHANICAL PUSH BUTTON PRESETS (CLICK TO TUNE)
          </span>
          <span className="text-[10px] font-mono text-[#8a6839]">
            INSTANT TUNING
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {VINTAGE_PRESETS.map((preset) => {
            const isSelected = activeStation?.stationuuid === preset.stationId;
            return (
              <button
                key={preset.presetNumber}
                onClick={() => {
                  const target = stations.find(s => s.stationuuid === preset.stationId);
                  if (target) onSelectStation(target);
                }}
                className={`py-2 px-2 rounded-xl text-center font-mono text-[11px] font-bold transition-all duration-150 cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-b from-[#e6a13b] to-[#b37517] text-[#1a0e05] border-[#ffd68a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_0_12px_rgba(255,160,30,0.6)] translate-y-0.5"
                    : "bg-gradient-to-b from-[#3a2818] via-[#24180e] to-[#170e08] text-[#e2c79f] border-[#6b4c24] hover:border-[#b8860b] hover:text-[#fff0d6] shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] active:translate-y-0.5"
                }`}
                title={`Preset ${preset.presetNumber}: ${preset.label}`}
              >
                <div className="text-[9px] text-[#ffb84d] font-sans opacity-70">
                  CH {preset.presetNumber}
                </div>
                <div className="truncate font-serif tracking-tight mt-0.5">
                  {preset.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BAND / GENRE SELECTOR (NEWS HIGHLIGHTED) */}
      {/* ======================================================== */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-[#1c120a]/90 p-2 rounded-xl border border-[#785829]/40">
        
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#c4974f] px-2 font-semibold">
            BAND:
          </span>

          <button
            onClick={() => onCategoryChange("news")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === "news"
                ? "bg-[#d4af37] text-[#1a0e05] shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                : "bg-[#2b1b0e] text-[#d4af37] hover:bg-[#3d2714]"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>GLOBAL NEWS ({stations.filter(s => s.category === "news").length})</span>
          </button>

          <button
            onClick={() => onCategoryChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeCategory === "all"
                ? "bg-[#d4af37] text-[#1a0e05]"
                : "bg-[#2b1b0e] text-[#f6ebd7] hover:bg-[#3d2714]"
            }`}
          >
            ALL BANDS ({stations.length})
          </button>

          <button
            onClick={() => onCategoryChange("music")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeCategory === "music"
                ? "bg-[#d4af37] text-[#1a0e05]"
                : "bg-[#2b1b0e] text-[#f6ebd7] hover:bg-[#3d2714]"
            }`}
          >
            <Music className="w-3 h-3" />
            <span>MUSIC & JAZZ</span>
          </button>

          <button
            onClick={() => onCategoryChange("retro")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeCategory === "retro"
                ? "bg-[#d4af37] text-[#1a0e05]"
                : "bg-[#2b1b0e] text-[#f6ebd7] hover:bg-[#3d2714]"
            }`}
          >
            <Disc className="w-3 h-3" />
            <span>VINTAGE & RETRO</span>
          </button>
        </div>

        {/* Scan & Step Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => handleStepTune(-1)}
            className="p-1.5 px-2.5 rounded-lg bg-[#2b1b0e] text-[#f6ebd7] hover:bg-[#3d2714] border border-[#6b4c24] text-xs font-mono flex items-center gap-1 cursor-pointer active:scale-95"
            title="Tune to previous station"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PREV</span>
          </button>

          <button
            onClick={handleScan}
            className="p-1.5 px-3 rounded-lg bg-[#3d2714] hover:bg-[#52351c] text-[#ffd68a] border border-[#785829] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
            title="Scan for random available station"
          >
            <RotateCw className="w-3 h-3 animate-spin" style={{ animationDuration: "6s" }} />
            <span>SCAN</span>
          </button>

          <button
            onClick={() => handleStepTune(1)}
            className="p-1.5 px-2.5 rounded-lg bg-[#2b1b0e] text-[#f6ebd7] hover:bg-[#3d2714] border border-[#6b4c24] text-xs font-mono flex items-center gap-1 cursor-pointer active:scale-95"
            title="Tune to next station"
          >
            <span className="hidden sm:inline">NEXT</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. TACTILE ROTARY KNOBS & SPEAKER GRILL DECK */}
      {/* ======================================================== */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Vintage Speaker Grill with Embedded Audio Visualizer */}
        <div className="md:col-span-5 rounded-2xl radio-speaker-grill p-5 flex flex-col justify-between min-h-[140px] border border-[#52381f]">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#a37c44] tracking-widest">
            <span>HIGH ACCURACY DYNAMIC SPEAKER</span>
            <span>8 OHM</span>
          </div>

          {/* Embedded Audio Visualizer Waves Glowing Behind Speaker Cloth */}
          <div className="flex items-center justify-center gap-1.5 py-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlaying 
                    ? "wave-bar" 
                    : "h-2 bg-[#422915]"
                }`}
                style={
                  isPlaying
                    ? {
                        height: `${Math.floor(10 + Math.sin(i) * 16 + 10)}px`,
                        animationDelay: `${(i * 0.08).toFixed(2)}s`,
                      }
                    : {}
                }
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#e2c79f] font-mono">
            <span>STATE: {isPlaying ? "BROADCASTING" : "IDLE"}</span>
            <span className="text-[#ffae34] font-semibold">{activeStation?.codec || "MP3"} 128k</span>
          </div>
        </div>

        {/* Right: Master Control Knobs, Big Play/Power, and Vacuum Tube Bay */}
        <div className="md:col-span-7 rounded-2xl radio-dark-brass p-4 sm:p-5 flex flex-col justify-between gap-4">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Master Play / Power Switch */}
            <div className="flex items-center gap-3">
              <button
                onClick={onTogglePlay}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 border ${
                  isPlaying
                    ? "bg-gradient-to-b from-[#b8860b] to-[#785829] text-[#1a0e05] border-[#ffd68a] shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                    : "bg-gradient-to-b from-[#3a2617] to-[#1c120a] text-[#ffae34] border-[#785829] hover:border-[#d4af37]"
                }`}
                title={isPlaying ? "Pause Broadcast" : "Power On & Play Broadcast"}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                )}
              </button>
              
              <div>
                <span className="text-[10px] font-mono tracking-wider text-[#c4974f] uppercase block">
                  MAIN POWER
                </span>
                <span className="font-serif font-bold text-sm text-[#f5ebd7]">
                  {isPlaying ? "RECEIVER LIVE" : "PRESS TO PLAY"}
                </span>
              </div>
            </div>

            {/* Volume Rotary Slider & Mute */}
            <div className="flex items-center gap-3 bg-[#170e08] p-2 px-3 rounded-xl border border-[#52381f]">
              <button
                onClick={onToggleMute}
                className="text-[#ffb84d] hover:text-[#fff0d6] transition-colors cursor-pointer"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px] font-mono text-[#c4974f]">
                  <span>VOLUME</span>
                  <span>{Math.round((isMuted ? 0 : volume) * 10)} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-24 accent-[#ff9800] h-1.5 bg-[#3a2617] rounded-lg cursor-pointer"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>

          </div>

          {/* AI Vacuum Tube Live Translator Section */}
          <div className="border-t border-[#785829]/40 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl transition-all ${
                isTranslating 
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 tube-glowing" 
                  : "bg-[#24180e] text-[#c4974f] border border-[#52381f]"
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#c4974f] uppercase tracking-wider block">
                  GEMINI AI TUBE TRANSLATOR
                </span>
                <span className="text-xs text-[#e2c79f] font-sans">
                  Live real-time broadcast interpretation
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Target language selector */}
              <select
                value={targetLanguage}
                onChange={(e) => onTargetLanguageChange(e.target.value)}
                className="bg-[#170e08] border border-[#6b4c24] text-[#f5ebd7] rounded-lg px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer"
                title="Select Live Translation Target Language"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              {/* Translate Toggle Button */}
              <button
                onClick={onToggleTranslate}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                  isTranslating
                    ? "bg-amber-500 text-[#1a0e05] shadow-[0_0_12px_rgba(245,158,11,0.5)] active:scale-95"
                    : "bg-[#332212] hover:bg-[#47301a] text-[#ffae34] border border-[#785829] active:scale-95"
                }`}
              >
                <span>{isTranslating ? "ACTIVE" : "START TRANSLATE"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
