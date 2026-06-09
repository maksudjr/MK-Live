export interface GuideEvent {
  id: string;
  title: string;
  timeStart: string; // e.g., "18:00"
  timeEnd: string; // e.g., "20:00"
  sport: string; // e.g., "Football", "Basketball", "F1"
  status: 'upcoming' | 'live' | 'finished';
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  streamUrl: string; // .m3u8 stream link
  category: string; // e.g. "Football", "Tennis", "Motorsports", "All-Sports"
  currentShow: string;
  currentShowTime: string;
  nextShow: string;
  guide: GuideEvent[];
  isDefault?: boolean;
}

export interface UserSettings {
  favorites: string[]; // Channel IDs
  theme: 'dark' | 'amoled' | 'sporty' | 'light' | 'green';
  bufferSize: number; // in seconds, e.g., 5, 10, 15
  lowLatency: boolean;
  streamQuality: 'auto' | 'high' | 'medium' | 'low';
  textScale: 'sm' | 'md' | 'lg';
  language?: 'en' | 'bn';
}
