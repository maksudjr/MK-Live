import { useState, useTransition } from 'react';
import { 
  Search, Heart, Radio, AlertCircle 
} from 'lucide-react';
import { Channel } from '../types';
import ChannelLogo from './ChannelLogo';

interface ChannelGuideProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  textScale: 'sm' | 'md' | 'lg';
}

export default function ChannelGuide({
  channels,
  selectedChannelId,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  textScale
}: ChannelGuideProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFavsOnly, setShowFavsOnly] = useState<boolean>(false);
  const [_, startTransition] = useTransition();

  // Dynamic category calculations to ensure every category assigned to a channel appears
  const existingCats = Array.from(
    new Set(
      channels
        .map((c) => c.category)
        .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '')
    )
  );
  const coreCats = ['Sports', 'News', 'Cartoons', 'Others'];
  const CATEGORIES = ['All', ...Array.from(new Set([...coreCats, ...existingCats]))];

  // Selected channel details
  const currentChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  // Filtering channels
  const filteredChannels = channels.filter((chan) => {
    const matchesSearch = chan.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          chan.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || chan.category === selectedCategory;
    const matchesFavorites = !showFavsOnly || favorites.includes(chan.id);

    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const getScaleClasses = () => {
    if (textScale === 'sm') return 'text-[11px]';
    if (textScale === 'lg') return 'text-[14px]';
    return 'text-[12px]';
  };

  return (
    <div id="channel-guide-container" className="font-sans text-slate-300 flex flex-col h-full bg-slate-950 overflow-hidden">
      
      {/* Category selection slide, search bar, & favorites toggle */}
      <div className="p-3 bg-slate-950 border-b border-slate-850 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2">
          {/* Search bar wrapper */}
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="guide-search-input"
              type="text"
              placeholder="Search sports, champions, match events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-sm pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Quick Star favorites view toggle */}
          <button
            id="guide-favs-only-toggle"
            onClick={() => startTransition(() => setShowFavsOnly(!showFavsOnly))}
            className={`p-1.5 shrink-0 rounded-sm border transition flex items-center gap-1.5 ${showFavsOnly ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
          >
            <Heart className={`w-4 h-4 ${showFavsOnly ? 'fill-blue-400 text-blue-400' : ''}`} />
            <span className="text-[10px] font-bold hidden sm:inline">Favorites</span>
          </button>
        </div>

        {/* Dynamic category filter bubble row layout */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
          {CATEGORIES.map((cat) => (
            <button
              id={`filter-category-${cat}`}
              key={cat}
              onClick={() => startTransition(() => setSelectedCategory(cat))}
              className={`px-3 py-1 text-[10px] font-semibold rounded-sm border transition shrink-0 ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-805 hover:border-slate-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Title Header for Channel List (replacing multi-screen tabs) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-850 shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-blue-400" /> Active Stations
        </span>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 border border-slate-800 rounded">
          {filteredChannels.length} Streams
        </span>
      </div>

      {/* Main Contents Lists (Saves height, scrolls cleanly inside viewport) */}
      <div className={`flex-grow overflow-y-auto p-3 ${getScaleClasses()}`}>
        {/* Channels Scroll grid */}
        <div className="grid grid-cols-3 gap-2">
          {filteredChannels.map((chan) => {
            const isSelected = chan.id === selectedChannelId;
            const isFav = favorites.includes(chan.id);
            return (
              <div
                id={`channel-grid-item-${chan.id}`}
                key={chan.id}
                onClick={() => onSelectChannel(chan.id)}
                className={`relative flex flex-col items-center justify-center p-2 rounded border transition-all cursor-pointer select-none ${isSelected ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10 text-white' : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80 text-slate-300'}`}
              >
                {/* Active indicator bar */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}

                {/* Hover/active indicator dots or tags */}
                {isSelected ? (
                  <span className="absolute top-1 left-1.5 text-[6px] font-mono tracking-widest text-blue-400 font-extrabold flex items-center gap-0.5 uppercase">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping inline-block" /> playing
                  </span>
                ) : (
                  <span className="absolute top-1 left-1.5 text-[6px] font-mono tracking-wider text-slate-500 uppercase">
                    {chan.category}
                  </span>
                )}

                {/* Star Favorites toggle on top right */}
                <button
                  id={`channel-fav-toggle-${chan.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(chan.id);
                  }}
                  className="absolute top-0.5 right-0.5 p-1 text-slate-600 hover:text-blue-400 hover:scale-110 transition z-10"
                >
                  <Heart className={`w-3 h-3 ${isFav ? 'text-blue-400 fill-blue-400 font-bold' : 'text-slate-600'}`} />
                </button>

                {/* Logo wrapper */}
                <div className="w-10 h-10 mt-3.5 mb-1 bg-slate-950 border border-slate-800 rounded-sm flex items-center justify-center shrink-0">
                  <ChannelLogo logo={chan.logo} name={chan.name} className="w-7 h-7 object-contain rounded-xs" fallbackSize="text-xs" />
                </div>

                {/* Title */}
                <h4 className="font-extrabold text-[10px] tracking-tight truncate w-full text-center leading-tight">
                  {chan.name}
                </h4>
              </div>
            );
          })}

          {filteredChannels.length === 0 && (
            <div className="col-span-full text-center py-10 bg-slate-900/20 border border-slate-800 rounded-sm p-4">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-400">No Channels Found</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                Adjust active filter parameters, disable "Favorites", or add channels inside the Admin Panel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
