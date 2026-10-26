import React, { useState, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { LocationGeoProfile } from "../types";

interface ParsedPath {
  id: string; 
  name: string; 
  d: string;
}

interface WorldMapProps {
  darkMode: boolean;
  onMapClick: (coords: { lat: number; lng: number }) => void;
  selectedProfile: LocationGeoProfile | null;
  loading: boolean;
  selectedCoords: { lat: number; lng: number } | null;
  radiusKm: number;
  setRadiusKm: (radius: number) => void;
  onRadiusChangeEnd: () => void;
}

export default function WorldMap({
  darkMode,
  onMapClick,
  selectedProfile,
  loading,
  selectedCoords,
  radiusKm,
  setRadiusKm,
  onRadiusChangeEnd
}: WorldMapProps) {
  const [mapPaths, setMapPaths] = useState<ParsedPath[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch world background SVG from jsdelivr
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/@highcharts/map-collection@1.1.3/custom/world.svg")
      .then((res) => {
        if (!res.ok) throw new Error("SVG map fetch failed");
        return res.text();
      })
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const paths = doc.querySelectorAll("path");

        const parsed: ParsedPath[] = Array.from(paths)
          .map((p) => {
            const hcKeyClass = p.getAttribute("class") || "";
            const keyMatch = hcKeyClass.match(/highcharts-key-([a-z2-9]+)/i);
            const id = (keyMatch ? keyMatch[1] : p.getAttribute("id") || p.getAttribute("data-id") || "").toUpperCase();
            
            return {
              id: id,
              name: p.getAttribute("name") || p.getAttribute("data-name") || id,
              d: p.getAttribute("d") || "",
            };
          })
          .filter((p) => p.d && p.id && p.id.length <= 3 && p.id !== "KEY");

        setMapPaths(parsed);
        setLoadingMap(false);
      })
      .catch((err) => {
        console.error("Failed to load map background graphics:", err);
        setLoadingMap(false);
      });
  }, []);

  const getSvgCoordinates = (lat: number, lng: number) => {
    // Fitted linear regression equations matching Highcharts equidistant cylindrical custom world map
    const x = 1.9018 * lng + 338.5973;
    const y = -1.9940 * lat + 212.6994;
    return { x, y };
  };

  // Click handler on map canvas
  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();

    // Click relative to the bounding box of the SVG element on screen
    const clickX = event.clientX - svgRect.left;
    const clickY = event.clientY - svgRect.top;

    // Target coordinate space is viewBox bounds 0 0 700 340
    const viewBoxWidth = 700;
    const viewBoxHeight = 340;

    const svgAspect = viewBoxWidth / viewBoxHeight;
    const containerAspect = svgRect.width / svgRect.height;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > svgAspect) {
      // Container is wider than aspect ratio: height scales to fit
      scale = svgRect.height / viewBoxHeight;
      const renderedWidth = viewBoxWidth * scale;
      offsetX = (svgRect.width - renderedWidth) / 2;
    } else {
      // Container is narrower than aspect ratio: width scales to fit
      scale = svgRect.width / viewBoxWidth;
      const renderedHeight = viewBoxHeight * scale;
      offsetY = (svgRect.height - renderedHeight) / 2;
    }

    const xOnMap = (clickX - offsetX) / scale;
    const yOnMap = (clickY - offsetY) / scale;

    // Precise linear back-projection formula to physical coordinates
    const lng = (xOnMap - 338.5973) / 1.9018;
    const lat = (yOnMap - 212.6994) / -1.9940;

    const clampedLng = Math.max(-180, Math.min(180, lng));
    const clampedLat = Math.max(-90, Math.min(90, lat));

    onMapClick({ lat: clampedLat, lng: clampedLng });
  };

  return (
    <div className="flex flex-col w-full aspect-[700/340] max-w-5xl max-h-[360px] md:max-h-[400px] lg:max-h-[450px] xl:max-h-[490px] mx-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative rounded-2xl overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800/50">
      
      {/* Map Canvas */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {loadingMap ? (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 font-display text-slate-500">
            <Globe className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm">Loading dynamic geographic projection...</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 700 340"
            className="w-full h-full select-none cursor-crosshair"
            onClick={handleSvgClick}
            id="world_svg_container"
          >
            {/* Landmass Paths styled with overlapping strokes to hide all national borders and create a seamless terrain */}
            <g id="landmass_group">
              {mapPaths.map((region) => {
                const landColor = darkMode ? "#1e293b" : "#e2e8f0";
                return (
                  <path
                    key={region.id || Math.random().toString()}
                    d={region.d}
                    className="transition-all duration-150 cursor-pointer opacity-100"
                    stroke={landColor} 
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    fill={landColor}
                    id={region.id ? `map_path_${region.id.toLowerCase()}` : undefined}
                  />
                );
              })}
            </g>

            {/* TRANSLUCENT VICINITY CIRCLE OVERLAY & DECORATIVE TARGETING RETICLE */}
            {selectedCoords && (() => {
              const { x, y } = getSvgCoordinates(selectedCoords.lat, selectedCoords.lng);
              // Linear radius approximation mapping for natural earth custom world.svg [700 width]
              // 40000 km is represented in 700 width -> radius scale is radiusKm / (40000 / 700) = radiusKm / 57.14
              const svgRadius = radiusKm / 57.14;
              return (
                <g id="vicinity_overlay_group" className="pointer-events-none">
                  {/* Centered locator glowing beacon */}
                  <g transform={`translate(${x}, ${y})`}>
                    <circle cx="0" cy="0" r="14" fill="rgba(16, 185, 129, 0.25)" className="animate-ping" style={{ animationDuration: "1.8s" }} />
                    <circle cx="0" cy="0" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" className="shadow" />
                  </g>
                </g>
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}
