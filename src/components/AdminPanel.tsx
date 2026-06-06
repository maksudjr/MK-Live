import React, { useState, useTransition } from 'react';
import { 
  Plus, Trash2, Key, Database, RefreshCw, Sparkles, 
  CheckCircle, HelpCircle, Code, ListPlus, X 
} from 'lucide-react';
import { Channel, GuideEvent } from '../types';
import ChannelLogo from './ChannelLogo';

interface AdminPanelProps {
  channels: Channel[];
  onUpdateChannels: (updated: Channel[]) => void;
  onResetChannels: () => void;
  onClose?: () => void;
}

export default function AdminPanel({ 
  channels, 
  onUpdateChannels, 
  onResetChannels,
  onClose
}: AdminPanelProps) {
  // Secured credential gate
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [passError, setPassError] = useState<string>('');

  // Single Manual Channel Form State
  const [manualName, setManualName] = useState<string>('');
  const [manualUrl, setManualUrl] = useState<string>('');
  const [manualLogo, setManualLogo] = useState<string>('⚽');
  const [manualCategory, setManualCategory] = useState<string>('Sports');

  // M3U Playlist Parser input
  const [m3uText, setM3uText] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [_, startTransition] = useTransition();

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
        id: `g-${Date.now()}-1`,
        title: `Warmup: ${channelName} Sports Preview`,
        timeStart: '14:00',
        timeEnd: '15:30',
        sport: mainSport,
        status: 'finished'
      },
      {
        id: `g-${Date.now()}-2`,
        title: `Live Match: ${channelName} ${desc}`,
        timeStart: '15:30',
        timeEnd: '19:00',
        sport: mainSport,
        status: 'live'
      },
      {
        id: `g-${Date.now()}-3`,
        title: `Analysis: Daily Recap & Interviews`,
        timeStart: '19:00',
        timeEnd: '21:00',
        sport: mainSport,
        status: 'upcoming'
      }
    ];
  };

  // Create single manual channel
  const handleAddManualChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualUrl.trim()) {
      showFeedback('error', 'Please enter both Channel Name and Stream URL (.m3u8).');
      return;
    }

    const newChannel: Channel = {
      id: `ch-manual-${Date.now()}`,
      name: manualName.trim(),
      logo: manualLogo || '🏆',
      streamUrl: manualUrl.trim(),
      category: manualCategory,
      currentShow: 'Live Broadcast',
      currentShowTime: 'Direct',
      nextShow: 'Upcoming Event',
      guide: []
    };

    startTransition(() => {
      onUpdateChannels([...channels, newChannel]);
    });
    
    // Clear Form fields
    setManualName('');
    setManualUrl('');
    setManualLogo('⚽');
    showFeedback('success', `"${newChannel.name}" added successfully!`);
  };

  // Parse paste-able M3U playlist text
  const handleParseM3U = () => {
    if (!m3uText.trim()) {
      showFeedback('error', 'Paste M3U playlist contents first.');
      return;
    }

    try {
      const lines = m3uText.split('\n');
      const parsedChannels: Channel[] = [];
      let currentInfo: { name: string; logo: string; logoUrl?: string } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
          // Parse channel info. Extract tvg-logo and group-title if present
          let name = 'M3U Channel';
          let logo = '📺';

          // Extract logo from tvg-logo="..." or logo="..."
          const logoMatch = line.match(/(?:tvg-logo|logo)="([^"]+)"/);
          let logoUrl = logoMatch ? logoMatch[1] : undefined;

          // Try to extract the channel name at the end of the line (after the last comma)
          const commaIndex = line.lastIndexOf(',');
          if (commaIndex !== -1) {
            const rawName = line.substring(commaIndex + 1).trim();
            if (rawName) name = rawName;
          }

          // Pick elegant emoji depending on keywords in title
          if (name.toLowerCase().includes('foot') || name.toLowerCase().includes('soccer')) logo = '⚽';
          else if (name.toLowerCase().includes('tennis')) logo = '🎾';
          else if (name.toLowerCase().includes('race') || name.toLowerCase().includes('motor') || name.toLowerCase().includes('f1')) logo = '🏎️';
          else if (name.toLowerCase().includes('basket')) logo = '🏀';
          else if (name.toLowerCase().includes('fight') || name.toLowerCase().includes('ufc') || name.toLowerCase().includes('mma')) logo = '🥊';
          else if (name.toLowerCase().includes('golf')) logo = '⛳';

          currentInfo = { name, logo, logoUrl };
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
          // Line acts as stream url
          if (currentInfo) {
            const sportType = detectCategory(currentInfo.name);
            const chan: Channel = {
              id: `ch-m3u-${Date.now()}-${parsedChannels.length}`,
              name: currentInfo.name,
              logo: currentInfo.logo,
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
            // Unnamed URL line fallback
            const fallbackName = `Live Channel ${parsedChannels.length + 1}`;
            const chan: Channel = {
              id: `ch-m3u-${Date.now()}-${parsedChannels.length}`,
              name: fallbackName,
              logo: '📡',
              streamUrl: line,
              category: 'All-Sports',
              currentShow: 'Generic High Quality Stream',
              currentShowTime: 'Ongoing',
              nextShow: 'Sports Roundup',
              guide: generateSportsGuide(fallbackName, 'All-Sports')
            };
            parsedChannels.push(chan);
          }
        }
      }

      if (parsedChannels.length === 0) {
        showFeedback('error', 'No valid stream URLs detected in M3U text.');
        return;
      }

      startTransition(() => {
        onUpdateChannels([...channels, ...parsedChannels]);
      });
      setM3uText('');
      showFeedback('success', `Parsed & imported ${parsedChannels.length} sports channels from playlist successfully!`);
    } catch (err: any) {
      showFeedback('error', `Parsing failed: ${err.message || 'Malformed M3U format'}`);
    }
  };

  const detectCategory = (name: string): string => {
    const l = name.toLowerCase();
    if (l.includes('toon') || l.includes('cartoon') || l.includes('bunny') || l.includes('kid') || l.includes('disney') || l.includes('anime')) {
      return 'Cartoons';
    }
    if (l.includes('news') || l.includes('info') || l.includes('headline') || l.includes('press') || l.includes('report') || l.includes('globe') || l.includes('world')) {
      return 'News';
    }
    if (l.includes('sport') || l.includes('foot') || l.includes('soccer') || l.includes('tennis') || l.includes('f1') || l.includes('racing') || l.includes('basket') || l.includes('fight') || l.includes('play') || l.includes('bein') || l.includes('espn')) {
      return 'Sports';
    }
    return 'Others';
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
    <div id="admin-panel-container" className="font-sans text-white h-full flex flex-col p-4 bg-slate-950 overflow-y-auto">
      {/* Locked Header State */}
      {!isAdminUnlocked ? (
        <div id="admin-passcode-gate" className="flex-grow flex flex-col items-center justify-center py-16 px-4 relative">
          {onClose && (
            <button
              id="admin-gate-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="bg-slate-900 border border-blue-500/20 rounded-sm p-6 w-full max-w-sm text-center shadow-2xl">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-white transition"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-white transition font-mono tracking-wider"
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
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-sm p-4">
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
                className="flex items-center gap-1.5 bg-slate-950 hover:bg-rose-950 border border-slate-850 text-rose-450 text-[10px] font-bold px-3 py-1.5 rounded-sm active:scale-95 transition"
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

          {/* M3U Fast Guide Auto-Populate Parser (requested: "Admin can place channel url m3u8 links to populate the guide data automatically.") */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">M3U Stream Auto-Populator</h3>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 font-bold">FASTER</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Paste m3u8 streams or complex playlists directly here. The system extracts live broadcasting URLs and automatically drafts dynamic 24-hour sports guides for every match.
            </p>
            <div className="relative">
              <textarea
                id="admin-m3u-textarea"
                rows={4}
                value={m3uText}
                onChange={(e) => setM3uText(e.target.value)}
                placeholder={`#EXTM3U\n#EXTINF:-1 tvg-logo="⚽" tvg-name="Sky Sports", Sky Sports HD\nhttps://example.com/stream1.m3u8`}
                className="w-full bg-slate-950 font-mono text-[10px] text-slate-300 border border-slate-850 rounded-sm p-3 focus:outline-none focus:border-blue-500/50 resize-y"
              />
            </div>
            <button
              id="admin-parse-m3u-btn"
              onClick={handleParseM3U}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-sm transition shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" /> Analyze Playlist & Populate Guide Telemetry
            </button>
          </div>

          {/* Form to Add Single Station */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Manual Channel Insertion</h3>
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
                  className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Sports">🏆 Sports</option>
                  <option value="News">📰 News</option>
                  <option value="Cartoons">🧸 Cartoons</option>
                  <option value="Others">🌐 Others</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Channel Logo (Emoji or Image URL)</label>
                <input
                  id="admin-input-logo"
                  type="text"
                  placeholder="e.g. ⚽, 🏆 or https://server.com/logo.png"
                  value={manualLogo}
                  onChange={(e) => setManualLogo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  id="admin-submit-channel-btn"
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 border border-slate-800 text-white text-xs font-semibold py-2.5 rounded-sm transition"
                >
                  <Plus className="w-4 h-4 text-blue-400" /> Insert Manual Channel
                </button>
              </div>
            </form>
          </div>

          {/* Active channels database list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Station Catalog ({channels.length} Channels)
            </h3>

            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden divide-y divide-slate-850 font-sans">
              {channels.map((chan) => (
                <div 
                  id={`admin-ch-row-${chan.id}`}
                  key={chan.id} 
                  className="flex items-center justify-between p-3.5 hover:bg-slate-900/80 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-sm shrink-0">
                      <ChannelLogo logo={chan.logo} name={chan.name} className="w-6 h-6 object-contain rounded-sm" fallbackSize="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{chan.name}</span>
                        <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                          {chan.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{chan.streamUrl}</p>
                    </div>
                  </div>

                  <button
                    id={`admin-delete-btn-${chan.id}`}
                    onClick={() => removeChannel(chan.id)}
                    className="p-2 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 rounded px-1.5 transition"
                    title="Remove Station"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
