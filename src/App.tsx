import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Sparkles, ScrollText, Copy, Download, Trash2, CheckCheck, 
  RefreshCw, ShieldAlert, Globe, Newspaper, Volume2, Info
} from "lucide-react";

import ClassicRadioCabinet from "./components/ClassicRadioCabinet";
import StationList from "./components/StationList";
import AudioPlayer from "./components/AudioPlayer";
import WorldMap from "./components/WorldMap";
import { RadioStation, LocationGeoProfile } from "./types";
import { LiveTranslateClient, LiveTranslateState } from "./services/liveTranslateClient";
import { CURATED_STATIONS, ExtendedRadioStation } from "./data/radioStations";

const SUPPORTED_LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Bengali",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Dutch",
  "Greek",
  "Gujarati",
  "Hebrew",
  "Indonesian",
  "Italian",
  "Japanese",
  "Kannada",
  "Korean",
  "Malayalam",
  "Marathi",
  "Norwegian",
  "Persian",
  "Polish",
  "Portuguese",
  "Russian",
  "Swedish",
  "Tamil",
  "Telugu",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese"
];

export default function App() {
  // Currently active station: default to BBC World Service (news classic)
  const [activeStation, setActiveStation] = useState<RadioStation | null>(CURATED_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Geocoding and geographic profile for world map
  const [selectedProfile, setSelectedProfile] = useState<LocationGeoProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>({ lat: 51.5074, lng: -0.1278 }); // London
  const [radiusKm, setRadiusKm] = useState<number>(500);

  // Gemini Live Voice-to-Voice Translate Client
  const [liveClient] = useState(() => new LiveTranslateClient());
  const [liveState, setLiveState] = useState<LiveTranslateState>({
    status: "idle",
    error: null,
    userTranscript: "",
    modelTranscript: "",
    turns: [],
  });
  const [liveTargetLang, setLiveTargetLang] = useState<string>("English");
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  // Toggle Live Voice-to-Voice Translator
  const toggleLiveTranslation = async () => {
    const currentStatus = liveClient.getLiveState().status;
    if (currentStatus === "connected" || currentStatus === "connecting") {
      liveClient.disconnect();
      setLiveState(liveClient.getLiveState());
    } else {
      await liveClient.connect(liveTargetLang, (updatedState) => {
        setLiveState({ ...updatedState });
      }, undefined, activeStation?.language);
    }
  };

  const handleCopyTranscript = () => {
    if (liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript) return;
    
    let text = "=== AMOGH BRODCASTS - Vintage Radio Teleprinter Transcript ===\n";
    text += `Station: ${activeStation?.name || "Global Receiver"}\n`;
    text += `Language: ${liveTargetLang}\n`;
    text += `Timestamp: ${new Date().toLocaleString()}\n\n`;
    
    liveState.turns.forEach((turn, idx) => {
      const timeStr = new Date(turn.timestamp).toLocaleTimeString();
      text += `[Turn ${idx + 1} - ${timeStr}]\n`;
      text += `Original Audio: ${turn.originalText}\n`;
      text += `Translation (${liveTargetLang}): ${turn.translatedText}\n\n`;
    });

    if (liveState.userTranscript) {
      text += `[Live Incoming]: ${liveState.userTranscript}\n`;
    }
    if (liveState.modelTranscript) {
      text += `[Live Translation]: ${liveState.modelTranscript}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  const handleDownloadTranscript = () => {
    if (liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript) return;

    let text = "=== AMOGH BRODCASTS - Vintage Radio Teleprinter Transcript ===\n";
    text += `Station: ${activeStation?.name || "Global Receiver"}\n`;
    text += `Target Language: ${liveTargetLang}\n`;
    text += `Timestamp: ${new Date().toLocaleString()}\n\n`;

    liveState.turns.forEach((turn, idx) => {
      const timeStr = new Date(turn.timestamp).toLocaleTimeString();
      text += `[Turn ${idx + 1} - ${timeStr}]\n`;
      text += `Original: ${turn.originalText}\n`;
      text += `Translated (${liveTargetLang}): ${turn.translatedText}\n\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amogh_broadcasts_transcript_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearSessionTranscript = () => {
    liveClient.clearHistory();
    setLiveState(liveClient.getLiveState());
  };

  // Auto-scroll transcript feed
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [liveState.turns, liveState.userTranscript, liveState.modelTranscript]);

  useEffect(() => {
    return () => {
      liveClient.disconnect();
    };
  }, [liveClient]);

  // Synchronize translation session with radio playing state
  useEffect(() => {
    if (!isPlaying) {
      const currentStatus = liveClient.getLiveState().status;
      if (currentStatus === "connected" || currentStatus === "connecting") {
        liveClient.disconnect();
        setLiveState(liveClient.getLiveState());
      }
    }
  }, [isPlaying, liveClient]);

  const updateProfile = async (lat: number, lng: number, radius: number) => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, radiusKm: radius }),
      });
      const data: LocationGeoProfile = await response.json();
      setSelectedProfile(data);
    } catch (err) {
      console.error("Geocoding query failed:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleMapLocationClick = (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    updateProfile(coords.lat, coords.lng, radiusKm);
  };

  const handleSelectStation = (station: RadioStation) => {
    const wasTranslating = liveState.status === "connected" || liveState.status === "connecting";
    if (wasTranslating) {
      liveClient.disconnect();
      liveClient.clearHistory();
      setLiveState(liveClient.getLiveState());
    }

    setActiveStation(station);
    setIsPlaying(true);

    if (wasTranslating) {
      setTimeout(() => {
        liveClient.connect(liveTargetLang, (updatedState) => {
          setLiveState({ ...updatedState });
        }, undefined, station.language);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#120d09] text-[#f5ebd7] relative selection:bg-[#ffb84d] selection:text-[#1c120a]">
      
      {/* ======================================================== */}
      {/* TOP NAVIGATION BAR CONTRACT (3 ZONES) */}
      {/* ======================================================== */}
      <header className="flex items-center justify-between gap-8 px-5 sm:px-8 py-4 border-b border-[#785829]/40 bg-[#170e08]/90 backdrop-blur-md sticky top-0 z-30">
        
        {/* Zone 1: Single text element wordmark in Cinzel display face */}
        <a 
          href="/" 
          className="font-serif font-black text-lg sm:text-xl tracking-widest text-[#f5ebd7] hover:text-[#ffd68a] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Radio className="w-5 h-5 text-[#d4af37]" />
          <span>AMOGH BRODCASTS</span>
        </a>

        {/* Zone 2: 4 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium text-[#c4974f]">
          <a href="#tuner" className="hover:text-[#ffd68a] transition-colors whitespace-nowrap shrink-0">
            Analog Tuner
          </a>
          <a href="#presets" className="hover:text-[#ffd68a] transition-colors whitespace-nowrap shrink-0">
            News Channels
          </a>
          <a href="#translator" className="hover:text-[#ffd68a] transition-colors whitespace-nowrap shrink-0">
            Vacuum Tube Translator
          </a>
          <a href="#worldmap" className="hover:text-[#ffd68a] transition-colors whitespace-nowrap shrink-0">
            World Airwaves
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => {
              const bbc = CURATED_STATIONS.find(s => s.stationuuid.includes("bbc")) || CURATED_STATIONS[0];
              handleSelectStation(bbc);
            }}
            className="px-4 py-2 text-xs font-mono font-bold text-[#1c120a] bg-gradient-to-b from-[#d4af37] to-[#aa820a] hover:from-[#e6c158] hover:to-[#b8860b] rounded-xl transition-all shadow-[0_0_10px_rgba(212,175,55,0.4)] whitespace-nowrap shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Tune BBC News</span>
          </button>
        </div>

      </header>

      {/* ======================================================== */}
      {/* MAIN RETRO RADIO WORKSPACE */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full gap-8">
        
        {/* SECTION 1: THE VINTAGE CLASSIC RADIO CABINET */}
        <section id="tuner" className="w-full">
          <ClassicRadioCabinet
            activeStation={activeStation}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSelectStation={handleSelectStation}
            stations={CURATED_STATIONS}
            volume={volume}
            onVolumeChange={(val) => {
              setVolume(val);
              setIsMuted(false);
            }}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            isTranslating={liveState.status === "connected" || liveState.status === "connecting"}
            onToggleTranslate={toggleLiveTranslation}
            targetLanguage={liveTargetLang}
            onTargetLanguageChange={(lang) => {
              setLiveTargetLang(lang);
              if (liveState.status === "connected" || liveState.status === "connecting") {
                liveClient.disconnect();
                liveClient.clearHistory();
                liveClient.connect(lang, (updated) => setLiveState({ ...updated }), undefined, activeStation?.language);
              }
            }}
            supportedLanguages={SUPPORTED_LANGUAGES}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => setActiveCategory(cat)}
          />
        </section>

        {/* SECTION 2: GEMINI VACUUM TUBE LIVE INTERPRETER TELEPRINTER FEED */}
        <section id="translator" className="w-full max-w-5xl mx-auto rounded-3xl bg-[#1a110a] border border-[#785829]/50 p-5 sm:p-7 shadow-xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#785829]/30 pb-4">
            
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                liveState.status === "connected" 
                  ? "bg-amber-500 text-[#1a0e05] shadow-[0_0_15px_rgba(245,158,11,0.6)] tube-glowing" 
                  : "bg-[#2b1c11] text-[#c4974f] border border-[#52381f]"
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#f5ebd7] flex items-center gap-2">
                  <span>Gemini AI Triode Teleprinter</span>
                  <span className="bg-[#2e1d0f] text-[#ffae34] border border-[#6b4c24] px-2 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase">
                    Model 3.5 Live
                  </span>
                </h3>
                <p className="text-xs text-[#a37c44] font-sans">
                  Real-time broadcast interpretation from {activeStation?.name || "the airwaves"} into {liveTargetLang}
                </p>
              </div>
            </div>

            {/* Actions for Transcript */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                disabled={liveState.turns.length === 0 && !liveState.userTranscript}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#291a0f] hover:bg-[#3d2714] text-[#ffd68a] border border-[#6b4c24] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                title="Copy live transcript"
              >
                {copiedTranscript ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTranscript}
                disabled={liveState.turns.length === 0 && !liveState.userTranscript}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#291a0f] hover:bg-[#3d2714] text-[#ffd68a] border border-[#6b4c24] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                title="Download transcript as text file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={clearSessionTranscript}
                disabled={liveState.turns.length === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#291a0f] hover:bg-rose-950/40 text-rose-300 border border-[#6b4c24] hover:border-rose-800 transition-colors cursor-pointer disabled:opacity-40"
                title="Clear transcript history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Connection Error or Status Warnings */}
          {liveState.error && (
            <div className="mt-3 flex items-center gap-2 bg-rose-950/40 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl border border-rose-800/40">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{liveState.error}</span>
            </div>
          )}

          {liveState.status === "connecting" && (
            <div className="mt-3 flex items-center gap-2 bg-amber-950/40 text-amber-300 text-xs px-3.5 py-2.5 rounded-xl border border-amber-800/40">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Calibrating Gemini Live audio stream translation pipeline...</span>
            </div>
          )}

          {/* Teleprinter Subtitle Feed */}
          <div 
            ref={transcriptContainerRef}
            className="mt-4 flex flex-col gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-[#120a05] p-3.5 rounded-xl border border-[#52381f]"
          >
            {liveState.turns.length > 0 && (
              <div className="hidden md:grid grid-cols-2 gap-4 border-b border-[#52381f] pb-2 text-[10px] font-mono font-bold text-[#a37c44] tracking-widest uppercase">
                <div>CAPTURED NATIVE BROADCAST</div>
                <div>SIMULTANEOUS TRANSLATION ({liveTargetLang})</div>
              </div>
            )}

            {liveState.turns.map((turn, idx) => (
              <div 
                key={idx}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2.5 border-b border-[#3d2714]/60 text-xs"
              >
                <div className="p-2.5 rounded-lg bg-[#1a110a] border border-[#452e18]">
                  <p className="text-[#f5ebd7] leading-relaxed font-sans text-xs">
                    {turn.originalText}
                  </p>
                  <span className="text-[9px] font-mono text-[#8a6839] mt-1 block">
                    {new Date(turn.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#24170e] border border-[#6b4c24]">
                  <p className="text-[#ffd68a] leading-relaxed font-sans text-xs font-medium">
                    {turn.translatedText}
                  </p>
                  <span className="text-[9px] font-mono text-[#ffb84d] mt-1 block">
                    Interpreted ({liveTargetLang})
                  </span>
                </div>
              </div>
            ))}

            {(liveState.userTranscript || liveState.modelTranscript) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border border-dashed border-[#785829] bg-[#1a110a]/50">
                  <p className="text-[#c4974f] italic">
                    {liveState.userTranscript || "Listening for speech segments..."}
                  </p>
                  <span className="text-[9px] font-mono text-[#ffae34] animate-pulse mt-1 block">
                    CAPTURING AUDIO...
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-dashed border-[#b8860b] bg-[#24170e]/50">
                  <p className="text-[#ffb84d] italic">
                    {liveState.modelTranscript || `Translating live to ${liveTargetLang}...`}
                  </p>
                  <span className="text-[9px] font-mono text-[#ffd68a] animate-pulse mt-1 block">
                    TRANSLATING...
                  </span>
                </div>
              </div>
            )}

            {liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[#8a6839]">
                <ScrollText className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#c4974f]">
                  Teleprinter Ready
                </p>
                <p className="text-[11px] text-[#805e2b] max-w-sm mt-0.5">
                  Press "START TRANSLATE" on the radio cabinet to activate simultaneous Gemini Live speech translation.
                </p>
              </div>
            )}
          </div>

        </section>

        {/* SECTION 3: WORLD FREQUENCIES DIRECTORY & GLOBAL NEWS CHANNELS */}
        <section id="presets" className="w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[#785829]/40 mb-3">
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-[#f5ebd7] tracking-wide flex items-center gap-2">
                <span>World Radio & News Directory</span>
              </h2>
              <p className="text-xs text-[#a37c44]">
                Explore dozens of top international news agencies, cultural broadcasts, and musical airwaves
              </p>
            </div>
          </div>

          <StationList
            currentCountryProfile={selectedProfile}
            onSelectStation={handleSelectStation}
            activeStation={activeStation}
            isPlaying={isPlaying}
            isProfileLoading={profileLoading}
            selectedCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />
        </section>

        {/* SECTION 4: WORLD AIRWAVES MAP */}
        <section id="worldmap" className="w-full max-w-5xl mx-auto rounded-3xl bg-[#1c120a] border border-[#785829]/50 p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#f5ebd7] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#d4af37]" />
                <span>Geographic Signal Scanner</span>
              </h3>
              <p className="text-xs text-[#a37c44]">
                Click anywhere on the globe to tune into real regional broadcasting towers
              </p>
            </div>

            {selectedProfile && (
              <div className="text-left sm:text-right">
                <span className="text-xs font-serif font-bold text-[#ffd68a]">
                  {selectedProfile.country}
                </span>
                <span className="text-[10px] text-[#c4974f] block font-mono">
                  {selectedProfile.language} • {selectedProfile.capital}
                </span>
              </div>
            )}
          </div>

          <WorldMap
            darkMode={true}
            onMapClick={handleMapLocationClick}
            selectedProfile={selectedProfile}
            loading={profileLoading}
            selectedCoords={selectedCoords}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            onRadiusChangeEnd={() => {
              if (selectedCoords) updateProfile(selectedCoords.lat, selectedCoords.lng, radiusKm);
            }}
          />
        </section>

      </main>

      {/* ======================================================== */}
      {/* VINTAGE BRASS STICKY AUDIO PLAYER CONTROLLER */}
      {/* ======================================================== */}
      <footer className="sticky bottom-0 z-40 bg-[#170e08]/95 backdrop-blur-md shadow-2xl border-t border-[#785829]/70">
        <AudioPlayer
          station={activeStation}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          volume={volume}
          onVolumeChange={(v) => {
            setVolume(v);
            setIsMuted(false);
          }}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      </footer>

    </div>
  );
}
