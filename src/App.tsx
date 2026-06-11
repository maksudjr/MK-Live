import { useState, useEffect, useRef, startTransition, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, Compass, ShieldAlert, Settings, Radio, 
  Clock, Heart, List, HelpCircle, Power, X, ExternalLink
} from 'lucide-react';

import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

import { Channel, UserSettings } from './types';
import { DEFAULT_CHANNELS } from './mockData';
import { getTranslation, LanguageType } from './translations';
import VideoPlayer from './components/VideoPlayer';
import ChannelGuide from './components/ChannelGuide';
import AdminPanel from './components/AdminPanel';
import SettingsPanel from './components/SettingsPanel';

const LOCAL_CHANNELS_KEY = 'mklive_channels_v1';
const LOCAL_SETTINGS_KEY = 'mklive_settings_v1';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>(() => {
    const cached = localStorage.getItem(LOCAL_CHANNELS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return DEFAULT_CHANNELS;
  });
  const [firebaseQuotaError, _setFirebaseQuotaError] = useState<string | null>(null);
  const isWritingRef = useRef<boolean>(false);
  const quotaErrorRef = useRef<boolean>(false);

  const setFirebaseQuotaError = (val: string | null) => {
    _setFirebaseQuotaError(val);
    quotaErrorRef.current = !!val;
  };
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'settings'>('home');
  const [performanceAlert, setPerformanceAlert] = useState<string>(() => {
    return localStorage.getItem('mklive_performance_alert') || 'Use Wifi connection or High speed connection for best performance.';
  });
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mklive_category_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return ['Sports', 'News', 'Cartoons', 'Others'];
  });
  const [settings, setSettings] = useState<UserSettings>({
    favorites: [],
    theme: 'dark',
    bufferSize: 10,
    lowLatency: true,
    streamQuality: 'auto',
    textScale: 'md',
    language: 'en'
  });
  const [isPending, startLayoutTransition] = useTransition();
  const [isFloatingPlayer, setIsFloatingPlayer] = useState<boolean>(false);

  const attemptedSeedingAlertRef = useRef(false);
  const attemptedSeedingOrderRef = useRef(false);

  // Load persistence configurations once and update clock, plus listen to Firestore channels
  useEffect(() => {
    // 1. Settings configuration loading
    const savedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed) {
          setSettings(prev => ({
            favorites: [],
            theme: 'dark',
            bufferSize: 10,
            lowLatency: true,
            streamQuality: 'auto',
            textScale: 'md',
            language: 'en',
            ...parsed
          }));
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
      if (isWritingRef.current || quotaErrorRef.current) {
        console.log('Suppressing Firestore channels snapshot update to respect optimistic local changes.');
        return;
      }

      const dbChannels: Channel[] = [];
      snapshot.forEach((doc) => {
        dbChannels.push(doc.data() as Channel);
      });

      // Keep channels sorted alphabetically by name to ensure stable view order
      dbChannels.sort((a, b) => a.name.localeCompare(b.name));
      setChannels(dbChannels);
      localStorage.setItem(LOCAL_CHANNELS_KEY, JSON.stringify(dbChannels));
      setFirebaseQuotaError(null);
    }, (error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
      if (isQuota) {
        setFirebaseQuotaError(errMessage);
      }
      console.warn('Real-time channels fetch deferred to local cache:', error);
      
      const cached = localStorage.getItem(LOCAL_CHANNELS_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChannels(parsed);
          }
        } catch (_) {}
      }

      // Comply with logging and diagnostic guidelines without fatal crash
      try {
        handleFirestoreError(error, OperationType.LIST, 'channels');
      } catch (err) {
        console.error('Handled Firestore list error:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time changes in performance alert configuration
  useEffect(() => {
    const alertDocRef = doc(db, 'app_configs', 'performance_alert');
    const unsubscribe = onSnapshot(alertDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && typeof data.text === 'string') {
          setPerformanceAlert(data.text);
          localStorage.setItem('mklive_performance_alert', data.text);
        }
      } else {
        // Automatically publish the default alert if none exists
        if (!attemptedSeedingAlertRef.current) {
          attemptedSeedingAlertRef.current = true;
          setDoc(alertDocRef, { text: 'Use Wifi connection or High speed connection for best performance.' })
            .catch(err => console.error('Error auto-seeding performance alert doc:', err));
        }
      }
      setFirebaseQuotaError(null);
    }, (error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
      if (isQuota) {
        setFirebaseQuotaError(errMessage);
      }
      console.warn('Error listening to app performance alert configs:', error);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time changes in category serialization order configuration
  useEffect(() => {
    const orderDocRef = doc(db, 'app_configs', 'category_order');
    const unsubscribe = onSnapshot(orderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.order)) {
          setCategoryOrder(data.order);
          localStorage.setItem('mklive_category_order', JSON.stringify(data.order));
        }
      } else {
        // Automatically publish default category order if none exists
        if (!attemptedSeedingOrderRef.current) {
          attemptedSeedingOrderRef.current = true;
          setDoc(orderDocRef, { order: ['Sports', 'News', 'Cartoons', 'Others'] })
            .catch(err => console.error('Error auto-seeding category_order:', err));
        }
      }
      setFirebaseQuotaError(null);
    }, (error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
      if (isQuota) {
        setFirebaseQuotaError(errMessage);
      }
      console.warn('Error listening to category order configs:', error);
    });

    return () => unsubscribe();
  }, []);

  // Update selected channel fallback once channels are loaded
  useEffect(() => {
    const activeChs = channels.filter(c => c.enabled !== false);
    if (activeChs.length > 0) {
      if (!selectedChannelId || !activeChs.some(c => c.id === selectedChannelId)) {
        setSelectedChannelId(activeChs[0].id);
      }
    } else if (channels.length > 0 && !selectedChannelId) {
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
    isWritingRef.current = true;
    try {
      // Always immediately save states and local storage for perfect offline resilience
      setChannels(updatedList);
      localStorage.setItem(LOCAL_CHANNELS_KEY, JSON.stringify(updatedList));

      const previousIds = channels.map(c => c.id);
      const updatedIds = updatedList.map(c => c.id);
      const deletedIds = previousIds.filter(id => !updatedIds.includes(id));

      interface Op {
        type: 'set' | 'delete';
        ref: any;
        data?: any;
      }
      const operations: Op[] = [];

      // 1. Delete removed channels from Firestore
      for (const id of deletedIds) {
        operations.push({
          type: 'delete',
          ref: doc(db, 'channels', id)
        });
      }

      // 2. Add or update active channel definitions in Firestore
      for (const chan of updatedList) {
        operations.push({
          type: 'set',
          ref: doc(db, 'channels', chan.id),
          data: chan
        });
      }

      // Chunk operations in batches of 300 to stay safely under Firestore limits
      const batches: Op[][] = [];
      const chunkSize = 300;
      for (let i = 0; i < operations.length; i += chunkSize) {
        batches.push(operations.slice(i, i + chunkSize));
      }

      for (const chunk of batches) {
        const batch = writeBatch(db);
        for (const op of chunk) {
          if (op.type === 'delete') {
            batch.delete(op.ref);
          } else if (op.type === 'set') {
            batch.set(op.ref, op.data);
          }
        }
        await batch.commit();
      }

      // Fallback if current active selected stream gets deleted
      if (updatedList.length > 0 && !updatedList.some(c => c.id === selectedChannelId)) {
        setSelectedChannelId(updatedList[0].id);
      }
      setFirebaseQuotaError(null);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
      if (isQuota) {
        setFirebaseQuotaError(errMessage);
      }
      console.warn('Failed to sync channel updates to Firestore, client fallback active:', error);
      try {
        handleFirestoreError(error, OperationType.WRITE, 'channels');
      } catch (err) {
        console.error('Firestore warning block suppressed:', err);
      }
    } finally {
      // Cooldown timer to prevent server snapshot callbacks from triggering during settle phase
      setTimeout(() => {
        isWritingRef.current = false;
      }, 1500);
    }
  };

  const handleResetChannels = async () => {
    if (window.confirm('Do you want to reset channel database to default streams? This will wipe your custom URLs.')) {
      isWritingRef.current = true;
      try {
        const resetList = [...DEFAULT_CHANNELS];
        setChannels(resetList);
        localStorage.setItem(LOCAL_CHANNELS_KEY, JSON.stringify(resetList));

        // Let's delete all existing channels using batch
        const deleteBatch = writeBatch(db);
        for (const chan of channels) {
          deleteBatch.delete(doc(db, 'channels', chan.id));
        }
        await deleteBatch.commit();

        // Seed default channels using batch
        const seedBatch = writeBatch(db);
        for (const chan of DEFAULT_CHANNELS) {
          seedBatch.set(doc(db, 'channels', chan.id), chan);
        }
        await seedBatch.commit();
        
        setFirebaseQuotaError(null);
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
        if (isQuota) {
          setFirebaseQuotaError(errMessage);
        }
        console.warn('Reset channels Firestore write deferred:', error);
        try {
          handleFirestoreError(error, OperationType.DELETE, 'channels');
        } catch (err) {
          console.error('Firestore reset block suppressed:', err);
        }
      } finally {
        setTimeout(() => {
          isWritingRef.current = false;
        }, 1500);
      }
    }
  };

  const handleUpdatePerformanceAlert = async (newAlert: string) => {
    try {
      localStorage.setItem('mklive_performance_alert', newAlert);
      setPerformanceAlert(newAlert);
      const alertDocRef = doc(db, 'app_configs', 'performance_alert');
      await setDoc(alertDocRef, { text: newAlert });
      setFirebaseQuotaError(null);
    } catch (error) {
       const errMessage = error instanceof Error ? error.message : String(error);
       const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
       if (isQuota) {
         setFirebaseQuotaError(errMessage);
       }
       console.error('Firestore warning alert save deferred:', error);
    }
  };

  const handleUpdateCategoryOrder = async (newOrder: string[]) => {
    try {
      localStorage.setItem('mklive_category_order', JSON.stringify(newOrder));
      setCategoryOrder(newOrder);
      const orderDocRef = doc(db, 'app_configs', 'category_order');
      await setDoc(orderDocRef, { order: newOrder });
      setFirebaseQuotaError(null);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exhausted') || errMessage.toLowerCase().includes('resource-exhausted');
      if (isQuota) {
        setFirebaseQuotaError(errMessage);
      }
      console.error('Firestore category order save deferred:', error);
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

  // Filter active channels for homepage dashboard and video player
  const activeChannels = channels.filter(c => c.enabled !== false);

  // Find the currently active playing source object
  const activePlayingChannel = activeChannels.find(c => c.id === selectedChannelId) || activeChannels[0];

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
      className={`h-screen flex flex-col justify-between overflow-hidden transition-all duration-300 theme-${settings.theme} theme-custom-bg theme-custom-text`}
    >
      {/* Dynamic Header (Geometric Balance style) */}
      <header className="shrink-0 h-16 flex items-center justify-between px-4 theme-custom-panel border-b theme-custom-border z-40 transition-all duration-300 opacity-100">
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
              By Maksudur Rahman.
            </span>
          </div>
        </div>

        {/* Real-time UTC clock and Secret Admin Portal button at the Corner */}
        <div className="flex items-center gap-2">
          <div className="hidden xs:flex items-center gap-1.5 theme-custom-input border theme-custom-border px-2.5 py-1 rounded-md">
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
            className={`flex items-center gap-1 py-1 px-2.5 rounded border text-[9px] font-extrabold uppercase tracking-widest transition ${activeTab === 'admin' ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'theme-custom-input theme-custom-border text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
            title="Access Admin portal (ID: maksud, Password: maksud)"
          >
            <ShieldAlert className="w-3 h-3 text-blue-500" />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* Elegant Warning Banner for Firestore Daily Quotas */}
      {firebaseQuotaError && (
        <div 
          id="firebase-quota-alert-banner" 
          className="shrink-0 bg-amber-950/95 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-3 z-30 transition-all font-sans"
        >
          <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-grow text-xs leading-normal">
            <span className="font-extrabold text-amber-400 uppercase tracking-wider block sm:inline mr-1.5">
              Database Limit Reached:
            </span>
            <span className="text-amber-200/90 font-medium">
              Daily write operations are currently offline due to free-tier usage caps, but offline local storage synchronization has activated automatically! You can keep adjusting, creating, or toggling channels safely. Your custom streams and settings will persist on this device.
            </span>
            <span className="block mt-1 text-[10px] text-amber-400/90 leading-relaxed">
              This quota will naturally reset tomorrow. You can monitor plans and statistics on the{' '}
              <a 
                href="https://firebase.google.com/pricing#cloud-firestore" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-amber-300 font-extrabold focus:outline-none"
              >
                Firebase Spark Plan (Enterprise Edition section)
              </a>. Direct project management or manual database scaling is available at your{' '}
              <a 
                href="https://console.firebase.google.com/project/premium-acronym-73n78/firestore/databases/ai-studio-32d69922-dece-43f8-9584-73406f6c959a/data?openUpgradeDialog=true" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-amber-300 font-extrabold focus:outline-none"
              >
                Firestore Console Database Link
              </a>.
            </span>
          </div>
          <button 
            id="close-quota-banner-btn"
            onClick={() => setFirebaseQuotaError(null)} 
            className="text-amber-400/70 hover:text-amber-250 transition p-1 hover:bg-amber-900/40 rounded shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main viewport Container (Fits screen on Android and has customized tabs scroll) */}
      <main className="flex-grow flex flex-col overflow-hidden relative theme-custom-bg">
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
              <div className="w-full md:w-[60%] shrink-0 p-3 theme-custom-bg flex flex-col justify-center border-b md:border-b-0 md:border-r theme-custom-border-light">
                {performanceAlert && (
                  <div className="mb-3 px-3.5 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded flex items-center gap-2.5 shadow-sm">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-yellow-500 animate-pulse" />
                    <p className="text-[10px] font-bold font-sans leading-tight tracking-normal text-yellow-500/95">
                      {performanceAlert === 'Use Wifi connection or High speed connection for best performance.' ? getTranslation('wifiAlert', settings.language) : performanceAlert}
                    </p>
                  </div>
                )}
                {isFloatingPlayer ? (
                  <div className="w-full aspect-video theme-custom-panel border theme-custom-border rounded-xl flex flex-col items-center justify-center p-6 text-center animate-pulse">
                    <Radio className="w-10 h-10 text-blue-500 mb-2" />
                    <h3 className="text-xs font-bold text-slate-300">{getTranslation('playingPopout', settings.language)}</h3>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1 mb-3">
                      {getTranslation('popoutMessage', settings.language)}
                    </p>
                    <button
                      id="return-inline-btn"
                      onClick={() => setIsFloatingPlayer(false)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                    >
                      {getTranslation('returnInline', settings.language)}
                    </button>
                  </div>
                ) : activePlayingChannel ? (
                  <VideoPlayer
                    channel={activePlayingChannel}
                    lowLatency={settings.lowLatency}
                    bufferSize={settings.bufferSize}
                    streamQuality={settings.streamQuality}
                    onTogglePiP={() => setIsFloatingPlayer(true)}
                    language={settings.language}
                  />
                ) : (
                  <div className="w-full aspect-video theme-custom-panel border theme-custom-border rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <Radio className="w-10 h-10 text-slate-500 mb-2 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-400">{getTranslation('noChannels', settings.language)}</h3>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                      {getTranslation('selectChannelToWatch', settings.language)}
                    </p>
                  </div>
                )}
              </div>

              {/* Selection Directory: Guides, Channels List and search */}
              <div className="flex-grow overflow-hidden flex flex-col min-h-0 theme-custom-bg">
                <ChannelGuide
                  channels={activeChannels}
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={(id) => startTransition(() => setSelectedChannelId(id))}
                  favorites={settings.favorites}
                  onToggleFavorite={toggleFavoriteChannel}
                  textScale={settings.textScale}
                  language={settings.language}
                  categoryOrder={categoryOrder}
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
                performanceAlert={performanceAlert}
                onUpdatePerformanceAlert={handleUpdatePerformanceAlert}
                language={settings.language}
                categoryOrder={categoryOrder}
                onUpdateCategoryOrder={handleUpdateCategoryOrder}
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
                channels={activeChannels}
                onUpdateSettings={handleUpdateSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Android styled Nav Toolbar */}
      <nav className="shrink-0 theme-custom-panel border-t theme-custom-border px-5 py-2 z-40 transition-all duration-300 opacity-100">
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* Home Player Tab */}
          <button
            id="nav-tab-home"
            onClick={() => startLayoutTransition(() => setActiveTab('home'))}
            className={`flex flex-col items-center gap-1 px-8 py-1.5 rounded-xl transition ${activeTab === 'home' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Tv className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black tracking-wider uppercase">{getTranslation('livePlayer', settings.language)}</span>
          </button>

          {/* User Custom Settings Tab */}
          <button
            id="nav-tab-settings"
            onClick={() => startLayoutTransition(() => setActiveTab('settings'))}
            className={`flex flex-col items-center gap-1 px-8 py-1.5 rounded-xl transition ${activeTab === 'settings' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black tracking-wider uppercase">{getTranslation('controlPanel', settings.language)}</span>
          </button>

        </div>
      </nav>

      {/* Floating Picture-in-Picture / Popout Player overlay */}
      {isFloatingPlayer && activePlayingChannel && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.05}
          className="fixed bottom-[74px] right-4 w-72 xs:w-80 sm:w-96 z-[100] bg-slate-950 border border-blue-500 rounded-xl shadow-2xl overflow-hidden shadow-blue-500/20 flex flex-col"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
        >
          {/* Pip Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between cursor-move select-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <span className="text-[9px] font-extrabold text-white uppercase tracking-wider truncate">
                {getTranslation('playingPopout', settings.language)}: {activePlayingChannel.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-sans">
              <button
                id="pip-dock-bar-btn"
                onClick={() => setIsFloatingPlayer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Dock Player Inline"
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
              <button
                id="pip-close-bar-btn"
                onClick={() => {
                  setIsFloatingPlayer(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-800 transition"
                title="Close Player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video Container */}
          <div className="aspect-video w-full bg-black relative">
            <VideoPlayer
              channel={activePlayingChannel}
              lowLatency={settings.lowLatency}
              bufferSize={settings.bufferSize}
              streamQuality={settings.streamQuality}
              isPiP={true}
              onTogglePiP={() => setIsFloatingPlayer(false)}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
