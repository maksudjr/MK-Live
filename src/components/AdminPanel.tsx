import React, { useState, useEffect, useTransition } from 'react';
import { 
  Plus, Trash2, Key, Database, RefreshCw, Sparkles, ListPlus, Download,
  CheckCircle, HelpCircle, Code, X, ShieldAlert, Upload, Edit,
  ArrowUp, ArrowDown, Move, Eye, EyeOff
} from 'lucide-react';
import { Channel, GuideEvent } from '../types';
import ChannelLogo from './ChannelLogo';
import { getTranslation, LanguageType } from '../translations';

interface AdminPanelProps {
  channels: Channel[];
  onUpdateChannels: (updated: Channel[]) => void;
  onResetChannels: () => void;
  onClose?: () => void;
  performanceAlert: string;
  onUpdatePerformanceAlert: (newAlert: string) => Promise<void>;
  language?: LanguageType;
  categoryOrder?: string[];
  onUpdateCategoryOrder?: (newOrder: string[]) => Promise<void>;
}

export default function AdminPanel({ 
  channels, 
  onUpdateChannels, 
  onResetChannels,
  onClose,
  performanceAlert,
  onUpdatePerformanceAlert,
  language,
  categoryOrder = [],
  onUpdateCategoryOrder
 }: AdminPanelProps) {
  // Secured credential gate
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [passError, setPassError] = useState<string>('');

  // Performance Alert State
  const [alertText, setAlertText] = useState<string>(performanceAlert);

  // Sync internal alert state with props if it updates on other tabs
  useEffect(() => {
    setAlertText(performanceAlert);
  }, [performanceAlert]);

  // Channel Editing State Helper
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  // Single Manual Channel Form State
  const [manualName, setManualName] = useState<string>('');
  const [manualUrl, setManualUrl] = useState<string>('');
  const [manualLogo, setManualLogo] = useState<string>('⚽');
  const [manualCategory, setManualCategory] = useState<string>('Sports');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [manualEnabled, setManualEnabled] = useState<boolean>(true);

  // Marked channels to remove state helper
  const [markedChannelIds, setMarkedChannelIds] = useState<string[]>([]);

  // M3U Playlist Fetcher & Parser State
  const [m3uUrl, setM3uUrl] = useState<string>('');
  const [m3uText, setM3uText] = useState<string>('');
  const [isLoaderFetching, setIsLoaderFetching] = useState<boolean>(false);

  // Helper function to build custom guide events for a channel
  const generateSportsGuide = (channelName: string, category: string): GuideEvent[] => {
    const sportsMap: Record<string, string> = {
      'Sports': 'Championship Live Match Coverage',
      'News': 'Headline Bulletins & Analysis Live',
      'Cartoons': 'Animated Cartoons Marathon Show',
      'Others': 'Global Focus Special Broadcast'
    };

    const mainSport = category;
    const desc = sportsMap[category] || 'Live Action Broadcast';

    return [
      {
        id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-1`,
        title: `Warmup: ${channelName} Sports Preview`,
        timeStart: '14:00',
        timeEnd: '15:30',
        sport: mainSport,
        status: 'finished'
      },
      {
        id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-2`,
        title: `Live Match: ${channelName} ${desc}`,
        timeStart: '15:30',
        timeEnd: '19:00',
        sport: mainSport,
        status: 'live'
      },
      {
        id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-3`,
        title: `Analysis: Daily Recap & Interviews`,
        timeStart: '19:00',
        timeEnd: '21:00',
        sport: mainSport,
        status: 'upcoming'
      }
    ];
  };

  const detectCategory = (name: string): string => {
    const l = name.toLowerCase();
    if (l.includes('toon') || l.includes('cartoon') || l.includes('bunny') || l.includes('kid') || l.includes('disney') || l.includes('anime')) {
      return 'Cartoons';
    }
    if (l.includes('news') || l.includes('info') || l.includes('headline') || l.includes('press') || l.includes('report') || l.includes('globe') || l.includes('world') || l.includes('somoy') || l.includes('jamuna')) {
      return 'News';
    }
    if (l.includes('sport') || l.includes('foot') || l.includes('soccer') || l.includes('tennis') || l.includes('f1') || l.includes('racing') || l.includes('basket') || l.includes('fight') || l.includes('play') || l.includes('bein') || l.includes('espn') || l.includes('cricket') || l.includes('willow') || l.includes('t-sports')) {
      return 'Sports';
    }
    return 'Others';
  };

  const handleFetchM3UPlaylist = async () => {
    if (!m3uUrl.trim()) {
      showFeedback('error', 'Please enter a valid M3U playlist URL.');
      return;
    }

    setIsLoaderFetching(true);
    showFeedback('success', 'Fetching playlist content via CORS proxy...');

    // Try multiple CORS proxy strategies sequentially
    const proxies = [
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    ];

    let playlistText = '';

    // Direct fetch is always attempted first in case backend offers permissive CORS
    try {
      const response = await fetch(m3uUrl.trim());
      if (response.ok) {
        playlistText = await response.text();
      }
    } catch (e) {
      console.warn('Direct fetch failed. Trying CORS-enabler proxy...');
    }

    if (!playlistText) {
      for (const proxyFn of proxies) {
        try {
          const proxyUrl = proxyFn(m3uUrl.trim());
          const response = await fetch(proxyUrl);
          if (response.ok) {
            playlistText = await response.text();
            if (playlistText) break;
          }
        } catch (e) {
          console.error('Proxy strategy failed:', e);
        }
      }
    }

    setIsLoaderFetching(false);

    if (playlistText && playlistText.trim().length > 0) {
      setM3uText(playlistText);
      showFeedback('success', `Fetched playlist successfully! Analyzing contents...`);
      processM3UText(playlistText);
    } else {
      showFeedback('error', 'Unable to fetch data from live link due to cross-origin security blocks. Copy & paste the playlist text in the textbox below.');
    }
  };

  const processM3UText = (rawText: string) => {
    if (!rawText.trim()) {
      showFeedback('error', 'Pasted content of M3U config is empty.');
      return;
    }

    try {
      const lines = rawText.split('\n');
      const parsedChannels: Channel[] = [];
      let currentInfo: { name: string; logo: string; logoUrl?: string; category?: string } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
          let name = 'M3U Channel';
          let logo = '📺';

          const logoMatch = line.match(/(?:tvg-logo|logo)="([^"]+)"/i);
          let logoUrl = logoMatch ? logoMatch[1] : undefined;

          const groupMatch = line.match(/(?:group-title|tvg-group)="([^"]+)"/i);
          let parsedCategory = groupMatch ? groupMatch[1].trim() : '';

          const commaIndex = line.lastIndexOf(',');
          if (commaIndex !== -1) {
            const rawName = line.substring(commaIndex + 1).trim();
            if (rawName) name = rawName;
          }

          const lName = name.toLowerCase();
          if (lName.includes('foot') || lName.includes('soccer') || lName.includes('laliga') || lName.includes('premier')) logo = '⚽';
          else if (lName.includes('tennis')) logo = '🎾';
          else if (lName.includes('race') || lName.includes('motor') || lName.includes('f1') || lName.includes('motogp')) logo = '🏎️';
          else if (lName.includes('basket') || lName.includes('nba')) logo = '🏀';
          else if (lName.includes('fight') || lName.includes('ufc') || lName.includes('mma') || lName.includes('box')) logo = '🥊';
          else if (lName.includes('golf')) logo = '⛳';
          else if (lName.includes('cricket') || lName.includes('ipl')) logo = '🏏';
          else if (lName.includes('news') || lName.includes('cnn') || lName.includes('bbc')) logo = '📰';
          else if (lName.includes('cartoon') || lName.includes('disney') || lName.includes('kid')) logo = '🧸';

          currentInfo = { name, logo, logoUrl, category: parsedCategory };
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
          if (currentInfo) {
            const sportType = currentInfo.category || detectCategory(currentInfo.name);
            const chan: Channel = {
              id: `ch-m3u-${Date.now()}-${parsedChannels.length}-${Math.random().toString(36).substr(2, 5)}`,
              name: currentInfo.name,
              logo: currentInfo.logoUrl || currentInfo.logo,
              streamUrl: line,
              category: sportType,
              currentShow: `${currentInfo.name} Live Stream`,
              currentShowTime: 'Direct Broadcast',
              nextShow: 'Sports Review Special',
              guide: generateSportsGuide(currentInfo.name, sportType)
            };
            parsedChannels.push(chan);
            currentInfo = null;
          } else {
            const fallbackName = `Live Channel ${parsedChannels.length + 1}`;
            const chan: Channel = {
              id: `ch-m3u-${Date.now()}-${parsedChannels.length}-${Math.random().toString(36).substr(2, 5)}`,
              name: fallbackName,
              logo: '📡',
              streamUrl: line,
              category: 'Others',
              currentShow: 'Generic High Quality Stream',
              currentShowTime: 'Ongoing',
              nextShow: 'Sports Roundup',
              guide: generateSportsGuide(fallbackName, 'Others')
            };
            parsedChannels.push(chan);
          }
        }
      }

      if (parsedChannels.length === 0) {
        showFeedback('error', 'No valid streaming URLs matched. Please verify the playlist format.');
        return;
      }

      startTransition(() => {
        onUpdateChannels([...channels, ...parsedChannels]);
      });
      setM3uUrl('');
      setM3uText('');
      showFeedback('success', `Successfully processed & imported ${parsedChannels.length} new stations!`);
    } catch (err: any) {
      showFeedback('error', `Parsing failed: ${err.message || 'Malformed shape'}`);
    }
  };

  // Compute dynamic existing categories to populate the dropdown selection
  const existingCategories = Array.from(
    new Set(
      channels
        .map((c) => c.category)
        .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '')
    )
  );
  const coreCategories = ['Sports', 'News', 'Cartoons', 'Others'];
  const allDropdownCategories = Array.from(new Set([...coreCategories, ...existingCategories]));

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [_, startTransition] = useTransition();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showFeedback('error', 'Image size should be below 1MB to ensure memory storage optimization.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setManualLogo(reader.result);
        showFeedback('success', 'Custom logo image encoded & attached successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Credentials Unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId.trim() === 'maksud' && passkey === 'maksud') {
      setIsAdminUnlocked(true);
      setPassError('');
    } else {
      setPassError('Invalid credentials! Admin ID & Password must be "maksud".');
    }
  };



  const handleSaveAlert = async () => {
    if (!alertText.trim()) {
      showFeedback('error', 'Performance alert text cannot be empty.');
      return;
    }
    try {
      await onUpdatePerformanceAlert(alertText.trim());
      showFeedback('success', 'Performance notice updated successfully in real-time across all servers & clients!');
    } catch (err: any) {
      showFeedback('error', `Failed to update alert: ${err.message || err}`);
    }
  };

  // Create single manual channel or save changes
  const handleAddManualChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualUrl.trim()) {
      showFeedback('error', 'Please enter both Channel Name and Stream URL (.m3u8).');
      return;
    }

    const categoryToSave = (manualCategory === 'Custom' || !allDropdownCategories.includes(manualCategory))
      ? (customCategory.trim() || 'Others')
      : manualCategory;

    if (editingChannelId) {
      // Editing Mode
      const updated = channels.map(c => {
        if (c.id === editingChannelId) {
          return {
            ...c,
            name: manualName.trim(),
            streamUrl: manualUrl.trim(),
            category: categoryToSave,
            logo: manualLogo,
            enabled: manualEnabled
          };
        }
        return c;
      });

      startTransition(() => {
        onUpdateChannels(updated);
      });

      setEditingChannelId(null);
      showFeedback('success', 'Channel details updated successfully!');
    } else {
      // Creation Mode
      const newChannel: Channel = {
        id: `ch-manual-${Date.now()}`,
        name: manualName.trim(),
        logo: manualLogo || '🏆',
        streamUrl: manualUrl.trim(),
        category: categoryToSave,
        currentShow: 'Live Broadcast',
        currentShowTime: 'Direct',
        nextShow: 'Upcoming Event',
        guide: [],
        enabled: manualEnabled
      };

      startTransition(() => {
        onUpdateChannels([...channels, newChannel]);
      });
      showFeedback('success', `"${newChannel.name}" added successfully!`);
    }

    // Clear Form fields
    setManualName('');
    setManualUrl('');
    setManualLogo('⚽');
    setCustomCategory('');
    setManualEnabled(true);
  };

  const startEditingChannel = (chan: Channel) => {
    setEditingChannelId(chan.id);
    setManualName(chan.name);
    setManualUrl(chan.streamUrl);
    setManualLogo(chan.logo);
    setManualEnabled(chan.enabled !== false);
    
    const cat = chan.category || 'Sports';
    if (!allDropdownCategories.includes(cat)) {
      setManualCategory('Custom');
      setCustomCategory(cat);
    } else {
      setManualCategory(cat);
      setCustomCategory('');
    }
    showFeedback('success', `Loaded "${chan.name}" details for editing.`);
  };

  const cancelEditing = () => {
    setEditingChannelId(null);
    setManualName('');
    setManualUrl('');
    setManualLogo('⚽');
    setManualCategory('Sports');
    setCustomCategory('');
    setManualEnabled(true);
    showFeedback('success', 'Cancelled channel editing.');
  };

  const toggleChannelStatus = (chan: Channel) => {
    const nextStatus = chan.enabled === false ? true : false;
    const updated = channels.map(c => {
      if (c.id === chan.id) {
        return {
          ...c,
          enabled: nextStatus
        };
      }
      return c;
    });
    startTransition(() => {
      onUpdateChannels(updated);
    });
    const statusText = nextStatus ? 'Broadcasting ON (Visible on Dashboard)' : 'Broadcasting OFF (Hidden from Dashboard)';
    showFeedback('success', `Channel "${chan.name}" changed to ${statusText}!`);
  };

  const removeAllOfflineChannels = () => {
    const offlineChannels = channels.filter(c => c.enabled === false);
    if (offlineChannels.length === 0) {
      showFeedback('error', 'There are no offline channels to remove.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete all ${offlineChannels.length} offline channel(s)? This cannot be undone.`)) {
      const remaining = channels.filter(c => c.enabled !== false);
      startTransition(() => {
        onUpdateChannels(remaining);
      });
      // Clear marked IDs if they were deleted
      setMarkedChannelIds(prev => prev.filter(id => remaining.some(c => c.id === id)));
      showFeedback('success', `Successfully removed all ${offlineChannels.length} offline channels!`);
    }
  };

  const removeMarkedChannels = () => {
    if (markedChannelIds.length === 0) {
      showFeedback('error', 'No channels are marked for removal. Check the mark checkboxes first.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete all ${markedChannelIds.length} marked channel(s)?`)) {
      const remaining = channels.filter(c => !markedChannelIds.includes(c.id));
      startTransition(() => {
        onUpdateChannels(remaining);
      });
      setMarkedChannelIds([]);
      showFeedback('success', `Successfully removed ${markedChannelIds.length} marked channels!`);
    }
  };

  const toggleSelectAllChannels = () => {
    if (markedChannelIds.length === channels.length && channels.length > 0) {
      // Unmark all
      setMarkedChannelIds([]);
      showFeedback('success', 'Cleared all channel marks.');
    } else {
      // Mark all
      setMarkedChannelIds(channels.map(c => c.id));
      showFeedback('success', `Marked all ${channels.length} channels for removal.`);
    }
  };



  // Get all unique categories from categoryOrder prop followed by any extra ones from active channels
  const categoriesInDb = Array.from(
    new Set(
      channels
        .map((c) => c.category)
        .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '')
    )
  );

  // Combine categoryOrder with extra categories in database
  const currentCategoryList = Array.from(new Set([
    ...(categoryOrder || []),
    ...categoriesInDb,
    'Sports', 'News', 'Cartoons', 'Others'
  ])).filter(Boolean);

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (!onUpdateCategoryOrder) return;
    const newList = [...currentCategoryList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    
    // Swap items
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    
    try {
      await onUpdateCategoryOrder(newList);
      showFeedback('success', 'Home page category serial order updated successfully!');
    } catch (err: any) {
      showFeedback('error', `Failed to update category serial: ${err.message || err}`);
    }
  };

  const resetCategoryOrder = async () => {
    if (!onUpdateCategoryOrder) return;
    try {
      await onUpdateCategoryOrder(['Sports', 'News', 'Cartoons', 'Others']);
      showFeedback('success', 'Reset category serial to default order!');
    } catch (err: any) {
      showFeedback('error', `Failed to reset category serial: ${err.message || err}`);
    }
  };

  const removeChannel = (id: string) => {
    startTransition(() => {
      onUpdateChannels(channels.filter(c => c.id !== id));
    });
    showFeedback('success', 'Channel removed successfully.');
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div id="admin-panel-container" className="font-sans text-white h-full flex flex-col p-4 theme-custom-bg overflow-y-auto">
      {/* Locked Header State */}
      {!isAdminUnlocked ? (
        <div id="admin-passcode-gate" className="flex-grow flex flex-col items-center justify-center py-16 px-4 relative">
          {onClose && (
            <button
              id="admin-gate-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 theme-custom-panel border theme-custom-border rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="theme-custom-panel border theme-custom-border rounded-sm p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-sm flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Admin Centralized Controls</h2>
            <p className="text-slate-400 text-[11px] mb-5">Enter secret ID & passcode to update MK LIVE stream sources.</p>
            
            <form onSubmit={handleUnlock} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Admin ID</label>
                <input
                  id="admin-id-input"
                  type="text"
                  required
                  placeholder="Enter ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full theme-custom-input border theme-custom-border-light rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Password</label>
                <input
                  id="admin-pass-input"
                  type="password"
                  required
                  placeholder="Enter Password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full theme-custom-input border theme-custom-border-light rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-white transition font-mono tracking-wider"
                />
              </div>

              {passError && <p className="text-rose-500 text-[10px] text-center font-mono py-1">{passError}</p>}
              
              <button
                id="admin-unlock-btn"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-sm transition shadow-lg mt-2"
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Unlocked Content Wrapper */
        <div id="admin-unlocked-board" className="space-y-6 max-w-3xl mx-auto w-full">
          {/* Top Info Hub */}
          <div className="flex items-center justify-between theme-custom-panel border theme-custom-border rounded-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">Live Station Telemetry</h2>
                <p className="text-[11px] text-slate-400 font-sans">Manage real-time stream links, category matching, & guide population.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="admin-reset-system-btn"
                onClick={onResetChannels}
                className="flex items-center gap-1.5 theme-custom-input hover:bg-rose-950 border theme-custom-border-light text-rose-455 text-[10px] font-bold px-3 py-1.5 rounded-sm active:scale-95 transition"
              >
                Reset Database
              </button>
              {onClose && (
                <button
                  id="admin-close-panel-btn"
                  onClick={onClose}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-sm text-[10px] font-bold transition"
                >
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              )}
            </div>
          </div>

          {/* Feedback message indicator */}
          {feedbackMsg && (
            <div className={`p-3 rounded-sm text-xs flex items-center gap-2 border font-sans animate-bounce ${feedbackMsg.type === 'success' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-rose-600/10 border-rose-500/30 text-rose-404'}`}>
              {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <HelpCircle className="w-4 h-4 shrink-0" />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Performance Advisory Banner Edit Panel */}
          <div className="theme-custom-panel border theme-custom-border rounded-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-yellow-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Performance Advisory Warning Alert</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Modify the alert notice shown in the main streaming view. All viewers on live servers and TV web views will see this alert update in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="admin-alert-text-input"
                type="text"
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                placeholder="Notice text (e.g. Use Wifi connection or High speed connection for best performance.)"
                className="flex-grow bg-slate-950 border border-slate-850 rounded-sm px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-yellow-500/50"
              />
              <button
                id="admin-save-alert-btn"
                type="button"
                onClick={handleSaveAlert}
                className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-black text-xs px-5 py-2 rounded-sm transition whitespace-nowrap active:scale-95"
              >
                Save Announcement
              </button>
            </div>
          </div>

          {/* Homepage Category Serial Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <Move className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Homepage Category Serial Manager</h3>
              </div>
              <button
                id="admin-reset-category-order-btn"
                type="button"
                onClick={resetCategoryOrder}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline transition"
              >
                Reset Default Order
              </button>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Arrange category blocks to shift priority on the TV directory slide view. Tap up or down switches next to any category to persistently realign their ordering instantly.
            </p>
            
            <div className="bg-slate-950/80 border border-slate-850 rounded divide-y divide-slate-850 overflow-hidden">
              {currentCategoryList.map((cat, index) => {
                const isFirst = index === 0;
                const isLast = index === currentCategoryList.length - 1;
                return (
                  <div
                    id={`admin-category-order-item-${cat}`}
                    key={cat}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-bold">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-slate-200">{cat}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-move-category-up-${cat}`}
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveCategory(index, 'up')}
                        className={`p-1 border border-slate-850 rounded transition ${isFirst ? 'opacity-30 cursor-not-allowed text-slate-750' : 'bg-slate-900 text-slate-400 hover:text-blue-400 hover:border-slate-700'}`}
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-move-category-down-${cat}`}
                        type="button"
                        disabled={isLast}
                        onClick={() => moveCategory(index, 'down')}
                        className={`p-1 border border-slate-850 rounded transition ${isLast ? 'opacity-30 cursor-not-allowed text-slate-755' : 'bg-slate-900 text-slate-400 hover:text-blue-400 hover:border-slate-700'}`}
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* M3U Fast Guide Auto-Populate Parser */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-4.5 space-y-4">
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Add Complete M3U Playlist (Multiple Channels)</h3>
              </div>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 font-black uppercase">BULK IMPORT</span>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed font-sans font-medium">
              Enter a live playlist URL link below (like <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded font-mono text-[10px]">https://go.skym3u.top/ye6r.m3u</code>) to download and extract multiple stations instantly.
            </p>

            <div className="space-y-3">
              {/* Option 1: URL Input Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Playlist Link URL (.m3u/.m3u8)
                </label>
                <div className="flex gap-2">
                  <input
                    id="admin-m3u-url-input"
                    type="url"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="e.g. https://go.skym3u.top/ye6r.m3u"
                    className="flex-grow bg-slate-950 border border-slate-850 rounded-sm px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    id="admin-import-link-btn"
                    type="button"
                    disabled={isLoaderFetching}
                    onClick={handleFetchM3UPlaylist}
                    className={`flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-bold text-xs px-4 py-2 rounded-sm transition whitespace-nowrap select-none ${isLoaderFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoaderFetching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Downloading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Fetch & Import
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Raw Text Clipboard Fallback */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Or Paste Raw M3U Contents Here (Direct Fallback)
                  </label>
                  {m3uText && (
                    <button
                      id="clear-raw-m3u"
                      onClick={() => setM3uText('')}
                      className="text-[9px] text-rose-450 hover:text-rose-400 transition underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="admin-m3u-textarea"
                  rows={4}
                  value={m3uText}
                  onChange={(e) => setM3uText(e.target.value)}
                  placeholder={`#EXTM3U\n#EXTINF:-1 tvg-logo="⚽" group-title="Sports", Sky Sports HD\nhttps://example.com/sportstream.m3u8`}
                  className="w-full bg-slate-950 font-mono text-[10px] text-slate-300 border border-slate-850 rounded-sm p-3 focus:outline-none focus:border-blue-500/50 resize-y"
                />
                
                <button
                  id="admin-parse-m3u-raw-btn"
                  type="button"
                  onClick={() => processM3UText(m3uText)}
                  className="w-full mt-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-sm transition border border-slate-850"
                >
                  <ListPlus className="w-3.5 h-3.5 text-blue-400" /> Parse & Add Raw Playlist Text
                </button>
              </div>
            </div>
          </div>

          {/* Form to Add / Edit Single Station */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              {editingChannelId ? (
                <Edit className="w-4.5 h-4.5 text-blue-500" />
              ) : (
                <Plus className="w-4.5 h-4.5 text-blue-500" />
              )}
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {editingChannelId ? 'Edit Sourcing Station Details' : 'Manual Channel Insertion'}
              </h3>
            </div>

            <form onSubmit={handleAddManualChannel} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Channel Name</label>
                <input
                  id="admin-input-name"
                  type="text"
                  required
                  placeholder="e.g. ESPN Ultimate Extra"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Stream HLS URL (.m3u8)</label>
                <input
                  id="admin-input-url"
                  type="url"
                  required
                  placeholder="https://server/live/stream.m3u8"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Channel Category</label>
                <select
                  id="admin-select-category"
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  {allDropdownCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      🏷️ {cat}
                    </option>
                  ))}
                  <option value="Custom">✨ + Create Custom Category...</option>
                </select>

                {(manualCategory === 'Custom' || !allDropdownCategories.includes(manualCategory)) && (
                  <div className="mt-2 space-y-1">
                    <label className="text-[10px] font-medium text-slate-400 block mt-1">New Custom Category Name</label>
                    <input
                      id="admin-input-custom-category"
                      type="text"
                      required
                      placeholder="e.g. Football, Movies, Kids, etc."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 bg-slate-950/40 p-3 rounded border border-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Station Logo / Icon</label>
                  <span className="text-[9px] text-slate-500 font-sans">Support emoji, image URL, or direct file upload</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Current Preview */}
                  <div className="sm:col-span-2 flex flex-col items-center justify-center h-12 w-12 bg-slate-950 border border-slate-800 rounded mx-auto sm:mx-0 shrink-0">
                    <ChannelLogo logo={manualLogo} name="Preview" className="w-8 h-8 object-contain rounded-xs" fallbackSize="text-base" />
                    <span className="text-[8px] text-slate-500 font-mono mt-0.5 uppercase">Preview</span>
                  </div>

                  {/* Text Input (Url or emoji) */}
                  <div className="sm:col-span-6 space-y-1">
                    <input
                      id="admin-input-logo"
                      type="text"
                      placeholder="e.g. ⚽, 🏆 or https://domain.com/logo.png"
                      value={manualLogo}
                      onChange={(e) => setManualLogo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder-slate-600"
                    />
                    <p className="text-[9px] text-slate-500">Edit values above or pick a local image file to auto-encode.</p>
                  </div>

                  {/* Direct File Upload button */}
                  <div className="sm:col-span-4 flex flex-col justify-center">
                    <label 
                      htmlFor="logo-file-picker" 
                      className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-sm text-xs font-bold cursor-pointer transition select-none text-center"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      Upload Logo File
                    </label>
                    <input
                      id="logo-file-picker"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic On/Off Channel Dashboard Visibility Toggle */}
              <div className="md:col-span-2 flex items-center gap-3 bg-slate-950/40 p-3.5 rounded border border-slate-850">
                <div className="flex items-center h-5">
                  <input
                    id="admin-input-enabled"
                    type="checkbox"
                    checked={manualEnabled}
                    onChange={(e) => setManualEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 bg-slate-950 border border-slate-800 rounded checked:bg-blue-650 focus:ring-blue-500 focus:ring-2 text-blue-600 cursor-pointer"
                  />
                </div>
                <div className="text-xs">
                  <label htmlFor="admin-input-enabled" className="font-bold text-slate-200 cursor-pointer flex items-center gap-1.5">
                     Channel Active Status (Visible on Dashboard)
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle this off to immediately stop broadcasting this channel on the home dashboard page without deleting the streams from database.</p>
                </div>
              </div>

              <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row gap-2">
                {editingChannelId ? (
                  <>
                    <button
                      id="admin-submit-channel-btn"
                      type="submit"
                      className="flex-grow flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-sm transition"
                    >
                      <CheckCircle className="w-4 h-4 text-white" /> Save Channel Changes
                    </button>
                    <button
                      id="admin-cancel-edit-btn"
                      type="button"
                      onClick={cancelEditing}
                      className="bg-slate-800 hover:bg-slate-700 text-rose-450 hover:text-rose-300 text-xs font-semibold py-2.5 px-4 rounded-sm transition font-sans border border-slate-700"
                    >
                      Cancel Edit
                    </button>
                  </>
                ) : (
                  <button
                    id="admin-submit-channel-btn"
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 border border-slate-800 text-white text-xs font-semibold py-2.5 rounded-sm transition"
                  >
                    <Plus className="w-4 h-4 text-blue-400" /> Insert Manual Channel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Active channels database list */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Station Catalog ({channels.length} Channels)
              </h3>
              <span className="text-[10px] font-medium text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 inline-block font-sans">
                💡 Click the edit button to update channel name, stream links, logos, or categories.
              </span>
            </div>

            {/* Bulk Actions / Multi-Selection Toolbar */}
            <div className="bg-slate-950 border border-slate-850/80 rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="admin-select-all-btn"
                  onClick={toggleSelectAllChannels}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded transition text-[10px] font-black uppercase tracking-wider"
                >
                  {markedChannelIds.length === channels.length && channels.length > 0 ? 'Deselect All' : 'Select / Mark All'}
                </button>
                <span className="text-slate-800">|</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Marked: <strong className="text-rose-450">{markedChannelIds.length}</strong> / {channels.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Remove All Offline Button */}
                <button
                  type="button"
                  id="admin-remove-offline-btn"
                  onClick={removeAllOfflineChannels}
                  className="bg-slate-900 border border-slate-800 hover:border-rose-950 text-slate-300 hover:text-rose-450 hover:bg-rose-950/10 py-1.5 px-3 rounded transition flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                  title="Remove all channels currently toggled off (offline)"
                >
                  <EyeOff className="w-3.5 h-3.5 text-rose-500" /> Remove Offline ({channels.filter(c => c.enabled === false).length})
                </button>

                {/* Remove Marked Button */}
                <button
                  type="button"
                  id="admin-remove-marked-btn"
                  onClick={removeMarkedChannels}
                  disabled={markedChannelIds.length === 0}
                  className={`py-1.5 px-3 rounded transition flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${markedChannelIds.length > 0 ? 'bg-rose-950/60 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-500/20' : 'bg-slate-900 text-slate-600 border border-slate-850 opacity-40 cursor-not-allowed'}`}
                  title="Remove all currently marked channels"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-450" /> Delete Marked ({markedChannelIds.length})
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden divide-y divide-slate-850 font-sans">
              {channels.map((chan) => (
                <div 
                  id={`admin-ch-row-${chan.id}`}
                  key={chan.id} 
                  className={`flex items-center justify-between p-3.5 hover:bg-slate-900/80 transition ${chan.enabled === false ? 'opacity-60 bg-slate-950/25' : ''} ${markedChannelIds.includes(chan.id) ? 'bg-rose-950/10 border-l border-l-rose-500' : ''}`}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden min-w-0 pr-4">
                    {/* Mark checkbox to remove */}
                    <input
                      type="checkbox"
                      id={`admin-ch-mark-${chan.id}`}
                      checked={markedChannelIds.includes(chan.id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setMarkedChannelIds(prev => 
                          isChecked 
                            ? [...prev, chan.id] 
                            : prev.filter(id => id !== chan.id)
                        );
                      }}
                      className="w-4 h-4 bg-slate-950 border border-slate-800 rounded checked:bg-rose-600 focus:ring-rose-500 text-rose-600 cursor-pointer shrink-0"
                      title="Mark this channel to remove"
                    />
                    <div className="w-8 h-8 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-sm shrink-0">
                      <ChannelLogo logo={chan.logo} name={chan.name} className="w-6 h-6 object-contain rounded-sm" fallbackSize="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{chan.name}</span>
                        <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                          {chan.category}
                        </span>
                        {chan.enabled === false && (
                          <span className="text-[8px] bg-rose-500/10 text-rose-450 px-1 py-0.5 border border-rose-500/20 rounded font-black font-mono uppercase tracking-wider">
                            OFFLINE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{chan.streamUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`admin-status-toggle-${chan.id}`}
                      onClick={() => toggleChannelStatus(chan)}
                      className={`p-2 border rounded transition ${chan.enabled !== false ? 'bg-emerald-950/40 hover:bg-emerald-900 text-emerald-400 border-emerald-500/20' : 'bg-slate-950 hover:bg-slate-900 text-slate-500 border-slate-800'}`}
                      title={chan.enabled !== false ? "Disable (Hide from Dashboard)" : "Enable (Show on Dashboard)"}
                    >
                      {chan.enabled !== false ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      id={`admin-edit-btn-${chan.id}`}
                      onClick={() => startEditingChannel(chan)}
                      className="p-2 bg-slate-950 hover:bg-blue-950 text-slate-400 hover:text-blue-400 border border-slate-800 rounded transition"
                      title="Edit Channel Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`admin-delete-btn-${chan.id}`}
                      onClick={() => removeChannel(chan.id)}
                      className="p-2 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 rounded transition"
                      title="Remove Station"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {channels.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No active channels. Click 'Clean Database' or load presets to replenish sports guide streams.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
