import React, { useState, useEffect } from "react";
import { RadioStation, LocationGeoProfile } from "../types";
import { Radio, Play, Volume2, ShieldAlert, BadgeCheck, Newspaper, Music, Search, Globe } from "lucide-react";
import { CURATED_STATIONS, ExtendedRadioStation } from "../data/radioStations";

interface StationListProps {
  currentCountryProfile: LocationGeoProfile | null;
  onSelectStation: (station: RadioStation) => void;
  activeStation: RadioStation | null;
  isPlaying: boolean;
  isProfileLoading?: boolean;
  selectedCategory?: string;
  onSelectCategory?: (cat: string) => void;
}

export default function StationList({
  currentCountryProfile,
  onSelectStation,
  activeStation,
  isPlaying,
  isProfileLoading = false,
  selectedCategory = "all",
  onSelectCategory,
}: StationListProps) {
  const [stations, setStations] = useState<RadioStation[]>(CURATED_STATIONS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>(selectedCategory);

  useEffect(() => {
    setFilterType(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (!currentCountryProfile) {
      setStations(CURATED_STATIONS);
      return;
    }

    setLoading(true);
    setSearchQuery("");

    const rawCodes = currentCountryProfile?.countryCodes && currentCountryProfile.countryCodes.length > 0
      ? currentCountryProfile.countryCodes
      : [currentCountryProfile?.countryCode];

    const codesToQuery = (rawCodes || []).filter(
      (code): code is string => typeof code === "string" && code.trim().length > 0
    );

    const fetchPromises = codesToQuery.map(codeString => {
      const code = codeString.toLowerCase().trim();
      return fetch(`https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${code}?limit=35&hidebroken=true&lastcheckok=1&order=clickcount&reverse=true`)
        .then((res) => {
          if (!res.ok) return [];
          return res.json();
        })
        .catch(() => []);
    });

    Promise.all(fetchPromises)
      .then((resultsArray: RadioStation[][]) => {
        let combinedStations: RadioStation[] = resultsArray.flat();

        const seenUuids = new Set<string>();
        combinedStations = combinedStations.filter((s) => {
          const mainUrl = s.url_resolved || s.url;
          if (!mainUrl || !mainUrl.startsWith("http")) return false;
          if (seenUuids.has(s.stationuuid)) return false;
          seenUuids.add(s.stationuuid);
          return true;
        });

        // Add simulated dial frequencies for local stations (between 88.0 and 108.0)
        const enrichedLocalStations = combinedStations.map((st, idx) => ({
          ...st,
          freqMhz: 88.0 + ((idx * 1.7) % 20),
          category: (st.tags?.toLowerCase().includes("news") ? "news" : "music") as "news" | "music"
        }));

        // Put curated national news stations first if matching country!
        const matchingCurated = CURATED_STATIONS.filter(
          cs => cs.countrycode.toLowerCase() === currentCountryProfile.countryCode.toLowerCase()
        );

        const finalList = [...matchingCurated, ...enrichedLocalStations];
        setStations(finalList.length > 0 ? finalList : CURATED_STATIONS);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Radio browser lookup error, falling back to curated collection", err);
        setStations(CURATED_STATIONS);
        setLoading(false);
      });
  }, [currentCountryProfile]);

  // Filter stations based on search query and category
  const filteredStations = stations.filter((station) => {
    const sQuery = searchQuery.trim().toLowerCase();
    
    // Category match
    if (filterType === "news") {
      const tags = (station.tags || "").toLowerCase();
      const name = (station.name || "").toLowerCase();
      const isNews = tags.includes("news") || tags.includes("talk") || tags.includes("info") || name.includes("news") || name.includes("info") || (station as any).category === "news";
      if (!isNews) return false;
    } else if (filterType === "music") {
      const tags = (station.tags || "").toLowerCase();
      const isNews = tags.includes("news") || tags.includes("talk");
      if (isNews && (station as any).category === "news") return false;
    } else if (filterType === "retro") {
      const tags = (station.tags || "").toLowerCase();
      const isRetro = tags.includes("retro") || tags.includes("vintage") || tags.includes("60s") || tags.includes("70s") || tags.includes("80s") || tags.includes("oldies") || (station as any).category === "retro";
      if (!isRetro) return false;
    }

    if (!sQuery) return true;

    return (
      (station.name || "").toLowerCase().includes(sQuery) ||
      (station.country || "").toLowerCase().includes(sQuery) ||
      (station.state && String(station.state).toLowerCase().includes(sQuery)) ||
      (station.tags && String(station.tags).toLowerCase().includes(sQuery))
    );
  });

  const isCurrentlyLoading = loading || isProfileLoading;

  return (
    <div className="flex flex-col gap-4 mt-2">
      
      {/* Category Tabs & Frequency Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#1e130a]/90 p-3.5 rounded-2xl border border-[#785829]/40">
        
        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setFilterType("all");
              if (onSelectCategory) onSelectCategory("all");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-[#d4af37] text-[#1a0e05] shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                : "bg-[#291a0f] text-[#f6ebd7] hover:bg-[#3d2714]"
            }`}
          >
            All Stations ({stations.length})
          </button>

          <button
            onClick={() => {
              setFilterType("news");
              if (onSelectCategory) onSelectCategory("news");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === "news"
                ? "bg-[#d4af37] text-[#1a0e05] shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                : "bg-[#291a0f] text-[#ffae34] hover:bg-[#3d2714]"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>World News Channels</span>
          </button>

          <button
            onClick={() => {
              setFilterType("music");
              if (onSelectCategory) onSelectCategory("music");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterType === "music"
                ? "bg-[#d4af37] text-[#1a0e05]"
                : "bg-[#291a0f] text-[#f6ebd7] hover:bg-[#3d2714]"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music & Jazz</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#a37c44] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search news channel, country, city, or frequency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#140b05] border border-[#5a3c18] text-[#f5ebd7] text-xs font-sans placeholder-[#805e2b] focus:outline-none focus:border-[#d4af37]"
          />
        </div>

      </div>

      {/* Grid of Radio Stations */}
      {isCurrentlyLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#1c120a] border border-[#52381f] flex flex-col gap-3 animate-pulse h-[140px]"
            >
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-xl bg-[#2e1d10]" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-3/4 bg-[#2e1d10] rounded" />
                  <div className="h-2.5 w-1/2 bg-[#2e1d10] rounded" />
                </div>
              </div>
              <div className="h-3 w-5/6 bg-[#2e1d10] rounded mt-auto" />
            </div>
          ))}
        </div>
      ) : filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStations.map((station) => {
            const isCurrent = activeStation?.stationuuid === station.stationuuid;
            const ext = station as ExtendedRadioStation;
            const freqDisplay = ext.freqMhz ? `${ext.freqMhz.toFixed(1)} FM` : "98.5 FM";
            const isNews = (station.tags || "").toLowerCase().includes("news") || ext.category === "news";

            return (
              <div
                key={station.stationuuid}
                onClick={() => onSelectStation(station)}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-[155px] relative cursor-pointer group shadow-md ${
                  isCurrent
                    ? "bg-gradient-to-br from-[#3d2714] to-[#24170d] border-[#d4af37] ring-1 ring-[#d4af37]/40 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
                    : "bg-[#1f140c]/90 hover:bg-[#2b1c11] border-[#5a3c18]/70 hover:border-[#8f692d]"
                }`}
                title={isCurrent && isPlaying ? `Now tuned to ${station.name}` : `Click to tune into ${station.name}`}
              >
                {/* Station Upper Section */}
                <div className="flex gap-3 items-start">
                  
                  {/* Station Icon / Favicon */}
                  <div className="w-11 h-11 rounded-xl bg-[#140b05] border border-[#5a3c18] flex-shrink-0 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                    {station.favicon ? (
                      <img
                        src={station.favicon}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const sib = target.nextSibling as HTMLDivElement;
                          if (sib) sib.style.display = "flex";
                        }}
                        className="w-full h-full object-contain"
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-[#d4af37]"
                      style={{ display: station.favicon ? "none" : "flex" }}
                    >
                      <Radio className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title & Frequency */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-[#ffae34] tracking-wider">
                        {freqDisplay}
                      </span>
                      {isNews && (
                        <span className="text-[9px] font-mono bg-red-950/60 text-red-300 border border-red-700/50 px-1.5 py-0.2 rounded font-bold uppercase">
                          NEWS
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#f5ebd7] truncate group-hover:text-[#ffd68a] transition-colors mt-0.5">
                      {station.name}
                    </h4>

                    <span className="text-[10px] text-[#a37c44] truncate block">
                      {station.state ? `${station.state}, ${station.country}` : station.country || "Worldwide Airwaves"}
                    </span>
                  </div>

                </div>

                {/* Tags / Subtitle */}
                <div className="text-[10px] font-sans text-[#c4974f] truncate flex items-center gap-1.5">
                  <span className="font-mono text-[#ffb84d]">•</span>
                  <span>{station.tags?.split(",").slice(0, 3).join(" • ") || "Live broadcast"}</span>
                </div>

                {/* Card Footer: Codec, Country & Play trigger */}
                <div className="flex justify-between items-center border-t border-[#452e18]/80 pt-2 text-[10px] font-mono text-[#8f692d]">
                  <div className="flex items-center gap-2">
                    <span className="uppercase text-[#a37c44]">{station.codec || "MP3"}</span>
                    <span>•</span>
                    <span className="text-[#c4974f]">{station.countrycode || "INT"}</span>
                  </div>

                  {/* Play Indicator */}
                  <div className={`p-1.5 rounded-full border transition-all ${
                    isCurrent && isPlaying
                      ? "bg-[#d4af37] text-[#1a0e05] border-[#ffd68a] shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-pulse"
                      : "bg-[#291a0f] text-[#d4af37] border-[#6b4c24] group-hover:bg-[#d4af37] group-hover:text-[#1a0e05]"
                  }`}>
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 translate-x-0.5" />
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#1c120a] border border-[#52381f] text-center flex flex-col justify-center items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-[#805e2b]" />
          <p className="text-sm font-serif font-bold text-[#f5ebd7]">
            No radio frequencies found matching "{searchQuery}"
          </p>
          <p className="text-xs text-[#a37c44] max-w-sm">
            Try checking the spelling or switch category tabs to view all available stations.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
            className="mt-3 text-xs bg-[#d4af37] text-[#1a0e05] font-mono font-bold rounded-xl px-4 py-2 hover:bg-[#e6c158] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

    </div>
  );
}
