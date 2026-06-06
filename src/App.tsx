import { useState, useEffect, startTransition, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, Compass, ShieldAlert, Settings, Radio, 
  Clock, Heart, List, HelpCircle, Power 
} from 'lucide-react';

import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

import { Channel, UserSettings } from './types';
import { DEFAULT_CHANNELS } from './mockData';
import VideoPlayer from './components/VideoPlayer';
import ChannelGuide from './components/ChannelGuide';
import AdminPanel from './components/AdminPanel';
import SettingsPanel from './components/SettingsPanel';

const LOCAL_CHANNELS_KEY = 'mklive_channels_v1';
const LOCAL_SETTINGS_KEY = 'mklive_settings_v1';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'settings'>('home');
  const [settings, setSettings] = useState<UserSettings>({
    favorites: [],
    theme: 'dark',
    bufferSize: 10,
    lowLatency: true,
    streamQuality: 'auto',
    textScale: 'md'
  });
  const [isPending, startLayoutTransition] = useTransition();

  // Load persistence configurations once and update clock, plus listen to Firestore channels
  useEffect(() => {
    // 1. Settings configuration loading
    const savedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed) {
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn('Failed to parse settings cache, falling back to default.');
      }
    }

    // 2. Dynamic Clock tick in absolute UTC interval
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time changes in Firestore channels collection
  useEffect(() => {
    const channelsCollection = collection(db, 'channels');

    const unsubscribe = onSnapshot(channelsCollection, (snapshot) => {
      const dbChannels: Channel[] = [];
      snapshot.forEach((doc) => {
        dbChannels.push(doc.data() as Channel);
      });

      // Keep channels sorted alphabetically by name to ensure stable view order
      dbChannels.sort((a, b) => a.name.localeCompare(b.name));
      setChannels(dbChannels);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels');
    });

    return () => unsubscribe();
  }, []);

  // Update selected channel fallback once channels are loaded
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const seedDefaultChannelsToFirestore = async () => {
    try {
      for (const chan of DEFAULT_CHANNELS) {
        const docRef = doc(db, 'channels', chan.id);
        await setDoc(docRef, chan);
      }
    } catch (error) {
      console.error('Failed to seed default channels into Firestore:', error);
    }
  };

  const handleUpdateChannels = async (updatedList: Channel[]) => {
    try {
      const previousIds = channels.map(c => c.id);
      const updatedIds = updatedList.map(c => c.id);
      const deletedIds = previousIds.filter(id => !updatedIds.includes(id));

      // 1. Delete removed channels from Firestore
      for (const id of deletedIds) {
        await deleteDoc(doc(db, 'channels', id));
      }

      // 2. Add or update active channel definitions in Firestore
      for (const chan of updatedList) {
        await setDoc(doc(db, 'channels', chan.id), chan);
      }

      // Fallback if current active selected stream gets deleted
      if (updatedList.length > 0 && !updatedList.some(c => c.id === selectedChannelId)) {
        setSelectedChannelId(updatedList[0].id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'channels');
    }
  };

  const handleResetChannels = async () => {
    if (window.confirm('Do you want to reset channel database to default streams? This will wipe your custom URLs.')) {
      try {
        for (const chan of channels) {
          await deleteDoc(doc(db, 'channels', chan.id));
        }
        await seedDefaultChannelsToFirestore();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'channels');
      }
    }
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const toggleFavoriteChannel = (chanId: string) => {
    let newFavs = [...settings.favorites];
    if (newFavs.includes(chanId)) {
      newFavs = newFavs.filter(id => id !== chanId);
    } else {
      newFavs.push(chanId);
    }
    handleUpdateSettings({
      ...settings,
      favorites: newFavs
    });
  };

  // Find the currently active playing source object
  const activePlayingChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  // Pick background base styling classes based on active setting theme
  const getThemeBackgroundClass = () => {
    switch (settings.theme) {
      case 'amoled':
        return 'bg-black text-slate-100';
      case 'sporty':
        return 'bg-slate-900 text-slate-100';
      case 'dark':
      default:
        return 'bg-slate-950 text-slate-500';
    }
  };

  return (
    <div 
      id="mklive-dashboard-app"
      className={`h-screen flex flex-col justify-between overflow-hidden transition-colors duration-300 bg-slate-950`}
    >
      {/* Dynamic Header (Geometric Balance style) */}
      <header className="shrink-0 h-16 flex items-center justify-between px-4 bg-slate-900/80 border-b border-slate-850 z-40 transition-all duration-300 opacity-100">
        <div className="flex items-center gap-3">
          {/* Logo element matches high-contrast sport styling */}
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center font-black text-xl italic text-white shadow-lg">
            <span>MK</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter text-white">
              LIVE <span className="text-blue-500 font-extrabold text-[12px] uppercase">TV</span>
            </h1>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono leading-none block">
              Core V2.1 Player
            </span>
          </div>
        </div>

        {/* Real-time UTC clock and Secret Admin Portal button at the Corner */}
        <div className="flex items-center gap-2">
          <div className="hidden xs:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-300 font-medium whitespace-nowrap">
              {utcTime || '00:00:00 UTC'}
            </span>
          </div>

          <button
            id="corner-admin-btn"
            onClick={() => {
              startLayoutTransition(() => {
                setActiveTab(activeTab === 'admin' ? 'home' : 'admin');
              });
            }}
            className={`flex items-center gap-1 py-1 px-2.5 rounded border text-[9px] font-extrabold uppercase tracking-widest transition ${activeTab === 'admin' ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
            title="Access Admin portal (ID: maksud, Password: maksud)"
          >
            <ShieldAlert className="w-3 h-3 text-blue-500" />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* Main viewport Container (Fits screen on Android and has customized tabs scroll) */}
      <main className="flex-grow flex flex-col overflow-hidden relative bg-slate-900">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              id="view-home-player"
              key="home-player"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0"
            >
              {/* Media Player wrapper - Stays pinned at top on small mobile, side during desktop */}
              <div className="w-full md:w-[60%] shrink-0 p-3 bg-slate-950/40 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800">
                {activePlayingChannel ? (
                  <VideoPlayer
                    channel={activePlayingChannel}
                    lowLatency={settings.lowLatency}
                    bufferSize={settings.bufferSize}
                    streamQuality={settings.streamQuality}
                  />
                ) : (
                  <div className="w-full aspect-video bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <Radio className="w-10 h-10 text-slate-500 mb-2 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-400">No Channels Available</h3>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                      Please enter a custom stream URL, import an M3U playlist, or click Reset Database in the Admin panel.
                    </p>
                  </div>
                )}
              </div>

              {/* Selection Directory: Guides, Channels List and search */}
              <div className="flex-grow overflow-hidden flex flex-col min-h-0 bg-slate-950">
                <ChannelGuide
                  channels={channels}
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={(id) => startTransition(() => setSelectedChannelId(id))}
                  favorites={settings.favorites}
                  onToggleFavorite={toggleFavoriteChannel}
                  textScale={settings.textScale}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              id="view-admin-dashboard"
              key="admin"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
              className="flex-grow overflow-hidden min-h-0"
            >
              <AdminPanel
                channels={channels}
                onUpdateChannels={handleUpdateChannels}
                onResetChannels={handleResetChannels}
                onClose={() => startLayoutTransition(() => setActiveTab('home'))}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              id="view-settings-dashboard"
              key="settings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
              className="flex-grow overflow-hidden min-h-0"
            >
              <SettingsPanel
                settings={settings}
                channels={channels}
                onUpdateSettings={handleUpdateSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Android styled Nav Toolbar */}
      <nav className="shrink-0 bg-slate-950 border-t border-slate-850 px-5 py-2 z-40 transition-all duration-300 opacity-100">
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* Home Player Tab */}
          <button
            id="nav-tab-home"
            onClick={() => startLayoutTransition(() => setActiveTab('home'))}
            className={`flex flex-col items-center gap-1 px-8 py-1.5 rounded-xl transition ${activeTab === 'home' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Tv className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black tracking-wider uppercase">Player</span>
          </button>

          {/* User Custom Settings Tab */}
          <button
            id="nav-tab-settings"
            onClick={() => startLayoutTransition(() => setActiveTab('settings'))}
            className={`flex flex-col items-center gap-1 px-8 py-1.5 rounded-xl transition ${activeTab === 'settings' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black tracking-wider uppercase">Settings</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
