export interface RadioStation {
  changeid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  clickcount: number;
  codec: string;
  bitrate: number;
  freqMhz?: number;
  category?: "news" | "music" | "talk" | "culture" | "retro";
  city?: string;
}

export interface LocationGeoProfile {
  country: string;
  countryCode: string;
  countryCodes?: string[];
  language: string;
  capital: string;
  description: string;
  nativeGreeting: string;
  genres: string[];
}

export interface BroadcastSegment {
  type: 'Station Profile' | 'Artist Spotlight' | 'Language Phrase' | 'Music History' | 'Broadcaster Tagline';
  originalText: string;
  estimatedDuration: number; // in seconds
}
