import { useState, useTransition } from 'react';
import { 
  Heart, Zap, LayoutDashboard, Sliders, Info, 
  Settings, CheckCircle, Smartphone 
} from 'lucide-react';
import { Channel, UserSettings } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
  channels: Channel[];
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export default function SettingsPanel({ 
  settings, 
  channels, 
  onUpdateSettings 
}: SettingsPanelProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

  const handleUpdate = (updated: Partial<UserSettings>) => {
    startTransition(() => {
      onUpdateSettings({
        ...settings,
        ...updated
      });
    });
    triggerSuccess('Setting saved successfully!');
  };

  const toggleFavorite = (chanId: string) => {
    let newFavs = [...settings.favorites];
    if (newFavs.includes(chanId)) {
      newFavs = newFavs.filter(id => id !== chanId);
    } else {
      newFavs.push(chanId);
    }
    handleUpdate({ favorites: newFavs });
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div id="settings-panel-container" className="font-sans text-slate-300 h-full flex flex-col p-4 bg-slate-950 overflow-y-auto space-y-6">
      
      {/* Settings Saved Notification */}
      {successMsg && (
        <div className="bg-blue-600/10 border border-blue-500/20 text-blue-400 p-3 rounded-sm text-xs flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stream Control Header */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-sm p-4">
        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-sm">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 font-sans">Live Player Preferences</h2>
          <p className="text-[11px] text-slate-400">Tweak network buffering settings & scale layouts to match Android tablets/screens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Playback Settings Group */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Stream Buffer Engine</h3>
          </div>

          {/* Buffering Max length selection */}
          <div className="space-y-1.5 font-sans">
            <span className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Max Buffer Depth (HLS buffer size):</span>
              <span className="text-blue-400 font-mono font-bold text-xs">{settings.bufferSize} seconds</span>
            </span>
            <input
              id="settings-buffer-slider"
              type="range"
              min="5"
              max="30"
              step="5"
              value={settings.bufferSize}
              onChange={(e) => handleUpdate({ bufferSize: parseInt(e.target.value) })}
              className="w-full accent-blue-500 bg-slate-800 rounded-lg h-1"
            />
            <p className="text-[9px] text-slate-500">Larger buffer sizes prevent stream stutter and loading screens in poor mobile areas.</p>
          </div>

          {/* Low Latency Mode */}
          <div className="flex items-center justify-between py-2 border-t border-slate-850">
            <div>
              <span className="text-xs font-semibold text-slate-100 block">Low Latency Mode</span>
              <span className="text-[9px] text-slate-500">Live sport streams synchronization</span>
            </div>
            <button
              id="settings-lowlatency-toggle"
              onClick={() => handleUpdate({ lowLatency: !settings.lowLatency })}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-105 ease-in-out ${settings.lowLatency ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-105 ease-in-out ${settings.lowLatency ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Stream Quality Preset */}
          <div className="space-y-1 pt-1.5 border-t border-slate-850">
            <label className="text-[11px] text-slate-400">Stream Resolution Heuristic</label>
            <div className="grid grid-cols-4 gap-2">
              {(['auto', 'low', 'medium', 'high'] as const).map((q) => (
                <button
                  id={`settings-quality-${q}`}
                  key={q}
                  onClick={() => handleUpdate({ streamQuality: q })}
                  className={`py-1 text-center font-mono font-bold text-[10px] rounded border transition capitalize ${settings.streamQuality === q ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Viewport UI Resizer & Aspect options */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Android Optimization</h3>
          </div>

          {/* Themes options */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">Visual Theme:</span>
            <div className="grid grid-cols-3 gap-2">
              {(['dark', 'amoled', 'sporty'] as const).map((th) => (
                <button
                  id={`settings-theme-${th}`}
                  key={th}
                  onClick={() => handleUpdate({ theme: th })}
                  className={`py-1.5 text-center text-[10px] font-bold rounded border transition ${settings.theme === th ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
                >
                  {th === 'amoled' ? 'AMOLED Black' : th === 'sporty' ? 'Sporty Blue' : 'Slate Dark'}
                </button>
              ))}
            </div>
          </div>

          {/* Text scale factor for fits perfectly on android mobile */}
          <div className="space-y-1.5 pt-1 border-t border-slate-850">
            <span className="text-[11px] text-slate-400">Viewport Text Scaling (Anti-overflow):</span>
            <div className="grid grid-cols-3 gap-2">
              {(['sm', 'md', 'lg'] as const).map((st) => (
                <button
                  id={`settings-scale-${st}`}
                  key={st}
                  onClick={() => handleUpdate({ textScale: st })}
                  className={`py-1 text-center text-[10px] font-bold rounded border transition ${settings.textScale === st ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
                >
                  {st === 'sm' ? 'Compact' : st === 'md' ? 'Default' : 'Large'}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500">Pick 'Compact' to ensure all text grids and guides fit flawlessly without wrapping on compact smartphone displays.</p>
          </div>
        </div>
      </div>

      {/* Favorites Stream Channel Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Heart className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Station Quick-access Favorites</h3>
        </div>
        <p className="text-slate-400 text-xs">Tap a star to toggle display priority in your sports television homepage.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
          {channels.map((chan) => {
            const isFav = settings.favorites.includes(chan.id);
            return (
              <div 
                id={`settings-fav-${chan.id}`}
                key={chan.id}
                onClick={() => toggleFavorite(chan.id)}
                className={`flex items-center justify-between p-2.5 rounded-sm border transition cursor-pointer ${isFav ? 'bg-blue-950/20 border-blue-500/20 text-white' : 'bg-slate-950/45 border-slate-850 hover:bg-slate-900/40 text-slate-400'}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-sm shrink-0">{chan.logo}</span>
                  <span className="text-xs font-semibold truncate">{chan.name}</span>
                </div>
                <Heart className={`w-4 h-4 shrink-0 transition ${isFav ? 'text-blue-400 fill-blue-400' : 'text-slate-600 hover:text-white'}`} />
              </div>
            );
          })}
          {channels.length === 0 && (
            <div className="col-span-full text-center py-6 text-slate-500 text-xs font-mono">
              Configure channels in Admin Panel first.
            </div>
          )}
        </div>
      </div>

      {/* Developer Profile & Technical Notes */}
      <div className="bg-slate-900 border border-slate-850 rounded-sm p-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-slate-400 space-y-1">
            <p className="font-bold text-white uppercase tracking-wider">Developer & Platform Profile</p>
            <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-md space-y-1 mt-1 max-w-sm">
              <p className="text-[12px] font-extrabold text-white">Maksudur Rahman</p>
              <p className="text-[10px] text-blue-400 font-bold">Director, Maksud Computer</p>
            </div>
            <p className="text-slate-500 pt-1">Custom optimized client-side live sports stream engine with automatic fullscreen orientation lock & immersive playback auto-hide interface triggers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
