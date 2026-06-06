import { Channel } from './types';

export const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'ch-espn-live',
    name: 'MK SPORTS HD (Test Channel)',
    logo: '🏆',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Sports',
    currentShow: 'Madrid vs Barcelona - Classic El Clásico',
    currentShowTime: 'Live - 2nd Half',
    nextShow: 'MLS Weekly Round-up',
    isDefault: true,
    guide: [
      { id: 'espn-1', title: 'Live Match: Real Madrid vs Barcelona', timeStart: '15:00', timeEnd: '17:30', sport: 'Football', status: 'finished' },
      { id: 'espn-2', title: 'Champions League Highlights', timeStart: '17:30', timeEnd: '18:30', sport: 'Football', status: 'live' },
      { id: 'espn-3', title: 'ESPN FC Live Discussion', timeStart: '18:30', timeEnd: '20:00', sport: 'All-Sports', status: 'upcoming' },
      { id: 'espn-4', title: 'MLS Weekly Show: Goals & Drama', timeStart: '20:00', timeEnd: '21:30', sport: 'Football', status: 'upcoming' }
    ]
  },
  {
    id: 'ch-sky-premier',
    name: 'SKY CO-SPORTS (Sintel)',
    logo: '⚽',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    category: 'Sports',
    currentShow: 'Premier League: Arsenal vs Man City',
    currentShowTime: '17:30 - Live Now',
    nextShow: 'Super Sunday Match Analysis',
    isDefault: true,
    guide: [
      { id: 'sky-1', title: 'Pre-Match Warmup & Pitch Analysis', timeStart: '16:30', timeEnd: '17:30', sport: 'Football', status: 'finished' },
      { id: 'sky-2', title: 'Live: Arsenal vs Manchester City', timeStart: '17:30', timeEnd: '19:45', sport: 'Football', status: 'live' },
      { id: 'sky-3', title: 'Post-Match Fan Cam & Highlights', timeStart: '19:45', timeEnd: '21:00', sport: 'Football', status: 'upcoming' }
    ]
  },
  {
    id: 'ch-bein-tennis',
    name: 'BEIN INTERNATIONAL (Tears of Steel)',
    logo: '🎾',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'Sports',
    currentShow: 'Wimbledon Men\'s Singles Final',
    currentShowTime: '16:00 - Live Coverage',
    nextShow: 'Court-side Interviews',
    isDefault: true,
    guide: [
      { id: 'bein-1', title: 'Semi-final Round-up', timeStart: '14:00', timeEnd: '16:00', sport: 'Tennis', status: 'finished' },
      { id: 'bein-2', title: 'Wimbledon Men\'s Finals: Federer vs Nadal', timeStart: '16:00', timeEnd: '20:00', sport: 'Tennis', status: 'live' },
      { id: 'bein-3', title: 'Wimbledon Trophy Presentation', timeStart: '20:00', timeEnd: '21:00', sport: 'Tennis', status: 'upcoming' }
    ]
  },
  {
    id: 'ch-nasa-news',
    name: 'NASA HEADLINE NEWS',
    logo: '📡',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2012117/NASA-NTV1-HLS/master.m3u8',
    category: 'News',
    currentShow: 'Real-time Space Station Operations',
    currentShowTime: 'Ongoing News',
    nextShow: 'Global Discovery Bulletin',
    isDefault: true,
    guide: [
      { id: 'news-1', title: 'Cosmic Operations Bulletin', timeStart: '15:00', timeEnd: '17:00', sport: 'News', status: 'finished' },
      { id: 'news-2', title: 'Space Station News Daily', timeStart: '17:00', timeEnd: '19:00', sport: 'News', status: 'live' },
      { id: 'news-3', title: 'Universe Deep Research Press', timeStart: '19:00', timeEnd: '21:00', sport: 'News', status: 'upcoming' }
    ]
  },
  {
    id: 'ch-bigbunny-toon',
    name: 'BIG BUCK TOONS & CARTOONS',
    logo: '🐰',
    streamUrl: 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,640x360_1500,.f4v.csmil/master.m3u8',
    category: 'Cartoons',
    currentShow: 'Big Buck Bunny Animated Classic',
    currentShowTime: 'Direct Animation',
    nextShow: 'Classic Fun-hour Marathon',
    isDefault: true,
    guide: [
      { id: 'bunny-1', title: 'Classic Rabbit Adventures Part 1', timeStart: '16:00', timeEnd: '17:30', sport: 'Animation', status: 'finished' },
      { id: 'bunny-2', title: 'Big Buck Bunny Marathon Special', timeStart: '17:30', timeEnd: '19:30', sport: 'Animation', status: 'live' },
      { id: 'bunny-3', title: 'Funny Squirrels & Forest Stories', timeStart: '19:30', timeEnd: '21:00', sport: 'Animation', status: 'upcoming' }
    ]
  },
  {
    id: 'ch-euro-all',
    name: 'MK GLOBAL FOCUS',
    logo: '🪐',
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    category: 'Others',
    currentShow: 'World Documentaries & Features',
    currentShowTime: 'Interactive Feed',
    nextShow: 'International Travel Broadcast',
    isDefault: true,
    guide: [
      { id: 'others-1', title: 'Scenic Travel Chronicles', timeStart: '14:00', timeEnd: '17:00', sport: 'Others', status: 'finished' },
      { id: 'others-2', title: 'Global Focus: Documentaries Live', timeStart: '17:00', timeEnd: '19:30', sport: 'Others', status: 'live' },
      { id: 'others-3', title: 'Cosmopolitan Explorers', timeStart: '19:30', timeEnd: '21:30', sport: 'Others', status: 'upcoming' }
    ]
  }
];

