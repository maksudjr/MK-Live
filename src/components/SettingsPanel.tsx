import { useState, useTransition } from 'react';
import { 
  Zap, LayoutDashboard, Sliders, Info, 
  Settings, CheckCircle, Smartphone, Languages
} from 'lucide-react';
import { Channel, UserSettings } from '../types';
import { getTranslation } from '../translations';

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
    triggerSuccess(getTranslation('settingsSaved', updated.language || settings.language));
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div id="settings-panel-container" className="font-sans text-slate-300 h-full flex flex-col p-4 theme-custom-bg overflow-y-auto space-y-6">
      
      {/* Settings Saved Notification */}
      {successMsg && (
        <div className="bg-blue-600/10 border border-blue-500/20 text-blue-400 p-3 rounded-sm text-xs flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stream Control Header */}
      <div className="flex items-center gap-3 theme-custom-panel border theme-custom-border rounded-sm p-4">
        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-sm">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold theme-custom-text font-sans">
            {getTranslation('settingsTitle', settings.language)}
          </h2>
          <p className="text-[11px] text-slate-400">
            {getTranslation('settingsSub', settings.language)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Playback Settings Group */}
        <div className="theme-custom-panel border theme-custom-border rounded-sm p-4 space-y-4">
          <div className="flex items-center gap-2 border-b theme-custom-border pb-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {getTranslation('bufferEngine', settings.language)}
            </h3>
          </div>

          {/* Buffering Max length selection */}
          <div className="space-y-1.5 font-sans">
            <span className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{getTranslation('maxBufferDepth', settings.language)}</span>
              <span className="text-blue-400 font-mono font-bold text-xs">
                {settings.bufferSize} {getTranslation('seconds', settings.language)}
              </span>
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
            <p className="text-[9px] text-slate-500">
              {getTranslation('bufferDesc', settings.language)}
            </p>
          </div>

          {/* Low Latency Mode */}
          <div className="flex items-center justify-between py-2 border-t theme-custom-border-light">
            <div>
              <span className="text-xs font-semibold theme-custom-text block">
                {getTranslation('lowLatency', settings.language)}
              </span>
              <span className="text-[9px] text-slate-500">
                {getTranslation('lowLatencyDesc', settings.language)}
              </span>
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
          <div className="space-y-1 pt-1.5 border-t theme-custom-border-light">
            <label className="text-[11px] text-slate-400">
              {getTranslation('streamResolution', settings.language)}
            </label>
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

        {/* Viewport UI Resizer, Language & Theme options */}
        <div className="theme-custom-panel border theme-custom-border rounded-sm p-4 space-y-4">
          <div className="flex items-center gap-2 border-b theme-custom-border pb-2">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {getTranslation('androidOptimization', settings.language)}
            </h3>
          </div>

          {/* Themes options */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">
              {getTranslation('visualTheme', settings.language)}:
            </span>
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
              {(['dark', 'amoled', 'sporty', 'light', 'green'] as const).map((th) => (
                <button
                  id={`settings-theme-${th}`}
                  key={th}
                  onClick={() => handleUpdate({ theme: th })}
                  className={`py-1.5 text-center text-[10px] font-bold rounded border transition ${settings.theme === th ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
                >
                  {th === 'amoled' ? getTranslation('themeAmoled', settings.language) : 
                   th === 'sporty' ? getTranslation('themeSporty', settings.language) : 
                   th === 'light' ? getTranslation('themeLight', settings.language) : 
                   th === 'green' ? getTranslation('themeGreen', settings.language) : 
                   getTranslation('themeDark', settings.language)}
                </button>
              ))}
            </div>
          </div>

          {/* Language selection options */}
          <div className="space-y-1.5 pt-2 border-t theme-custom-border-light">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-blue-400" />
              <span>{getTranslation('langLabel', settings.language)}</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="settings-lang-en"
                onClick={() => handleUpdate({ language: 'en' })}
                className={`py-1.5 text-center text-[10px] font-bold rounded border transition ${settings.language === 'en' ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
              >
                {getTranslation('langEn', settings.language)}
              </button>
              <button
                id="settings-lang-bn"
                onClick={() => handleUpdate({ language: 'bn' })}
                className={`py-1.5 text-center text-[10px] font-bold rounded border transition ${settings.language === 'bn' ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
              >
                {getTranslation('langBn', settings.language)}
              </button>
            </div>
          </div>

          {/* Text scale factor for fits perfectly on android mobile */}
          <div className="space-y-1.5 pt-2 border-t theme-custom-border-light">
            <span className="text-[11px] text-slate-400">
              {getTranslation('textScaling', settings.language)}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['sm', 'md', 'lg'] as const).map((st) => (
                <button
                  id={`settings-scale-${st}`}
                  key={st}
                  onClick={() => handleUpdate({ textScale: st })}
                  className={`py-1 text-center text-[10px] font-bold rounded border transition ${settings.textScale === st ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-850'}`}
                >
                  {st === 'sm' ? getTranslation('textScaleCompact', settings.language) : 
                   st === 'md' ? getTranslation('textScaleDefault', settings.language) : 
                   getTranslation('textScaleLarge', settings.language)}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500">
              {getTranslation('textScalingDesc', settings.language)}
            </p>
          </div>
        </div>
      </div>

      {/* Developer Profile & Technical Notes */}
      <div className="theme-custom-panel border theme-custom-border rounded-sm p-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-slate-400 space-y-1">
            <p className="font-bold theme-custom-text uppercase tracking-wider">
              {getTranslation('devProfile', settings.language)}
            </p>
            <div className="bg-slate-950/80 border theme-custom-border-light p-3 rounded-md space-y-1 mt-1 max-w-sm">
              <p className="text-[12px] font-extrabold text-white">
                {settings.language === 'bn' ? 'মাকসুদুর রহমান' : 'Maksudur Rahman'}
              </p>
              <p className="text-[10px] text-blue-400 font-bold">
                {getTranslation('director', settings.language)}
              </p>
            </div>
            <p className="text-slate-500 pt-1">
              {getTranslation('customOptimizedMsg', settings.language)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
