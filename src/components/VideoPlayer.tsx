import React, { useEffect, useRef, useState, useTransition } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw,
  Activity, AlertCircle, RefreshCw, Layers, ExternalLink, Minimize2 
} from 'lucide-react';
import { Channel } from '../types';
import ChannelLogo from './ChannelLogo';
import { getTranslation, LanguageType } from '../translations';

interface VideoPlayerProps {
  channel: Channel;
  lowLatency: boolean;
  bufferSize: number;
  streamQuality: 'auto' | 'high' | 'medium' | 'low';
  isPiP?: boolean;
  onTogglePiP?: () => void;
  language?: LanguageType;
}

export default function VideoPlayer({ 
  channel, 
  lowLatency, 
  bufferSize, 
  streamQuality,
  isPiP = false,
  onTogglePiP,
  language
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [streamMeta, setStreamMeta] = useState<{ resolution: string; stats: string }>({ 
    resolution: 'Loading...', 
    stats: '' 
  });
  const [activeLevel, setActiveLevel] = useState<number>(-1);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [isAutoReducing, setIsAutoReducing] = useState<boolean>(false);
  const [autoReduceNote, setAutoReduceNote] = useState<string>('');
  const [stallCount, setStallCount] = useState<number>(0);
  const [isNativePiP, setIsNativePiP] = useState<boolean>(false);
  const [pipStatusMsg, setPipStatusMsg] = useState<string | null>(null);
  const [_, startTransition] = useTransition();
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Controls overlay auto-hide logic after 5 seconds of active playback
  useEffect(() => {
    const resetControlsTimer = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
          setShowQualityMenu(false);
        }, 5000);
      }
    };

    resetControlsTimer();

    const container = containerRef.current;
    if (!container) return;

    const handleInteraction = () => {
      resetControlsTimer();
    };

    container.addEventListener('mousemove', handleInteraction);
    container.addEventListener('mousedown', handleInteraction);
    container.addEventListener('touchstart', handleInteraction);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      container.removeEventListener('mousemove', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
    };
  }, [isPlaying]);

  // Automatically monitor native fullscreen switches to unlock orientation on exit
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        const anyOrientation = screen.orientation as any;
        if (anyOrientation && anyOrientation.unlock) {
          try {
            anyOrientation.unlock();
          } catch (e) {}
        }
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // Monitor native browser Picture-in-Picture event keys to update state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPiP = () => {
      setIsNativePiP(true);
    };

    const onLeavePiP = () => {
      setIsNativePiP(false);
    };

    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, [channel.streamUrl]);

  // Load and play the stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset player state to buffering immediately on channel switch
    setIsBuffering(true);
    setErrorText(null);
    setQualityLevels([]);
    setShowQualityMenu(false);

    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }

    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // High performance delayed buff state triggers
    const showBufferingWithDelay = () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      bufferingTimeoutRef.current = setTimeout(() => {
        setIsBuffering(true);
      }, 500); // 500ms grace period filters out micro-stalls and renders live fluid streaming
    };

    const clearBufferingState = () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      setIsBuffering(false);
    };

    // Standard HTML5 native support (iOS, some Safari version)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        clearBufferingState();
        setStreamMeta({ resolution: 'Native HLS', stats: 'iOS Native' });
        if (isPlaying) {
          video.play().catch(handlePlayError);
        }
      });
      
      video.addEventListener('waiting', showBufferingWithDelay);
      video.addEventListener('playing', () => {
        clearBufferingState();
        setIsPlaying(true);
      });
      video.addEventListener('error', () => {
        setErrorText('Failed to load stream. URL may be offline or blocked by CORS.');
        clearBufferingState();
      });
    } 
    // Use HLS.js for Android, PC, Chrome, Firefox
    else if (Hls.isSupported()) {
      const hlsConfig: any = {
        enableWorker: true,
        lowLatencyMode: true, // Custom engineered ultra low delay triggers
        maxBufferLength: 8, // Nimble high performance buffer size to load instantly
        maxMaxBufferLength: 15,
        maxBufferSize: 30 * 1024 * 1024, // 30MB maximum memory limit for smooth delivery
        liveSyncDurationCount: 2.0, // Live syncing offset closer to live action
        liveMaxLatencyDurationCount: 4.5,
        
        // Dynamic adaptive bitrate start level (conservative values to guarantee instantaneous start)
        abrEwmaDefaultEstimate: 400000, 
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,
        
        // Instant stall recovery loop
        nudgeMaxRetry: 10,
        nudgeDelay: 0.1, // rapid nudging (0.1s steps)
        
        // Fast loading and failure retries
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 500,
      };

      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      hls.loadSource(channel.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (isPlaying) {
          video.play().catch(handlePlayError);
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        clearBufferingState();
        
        // Parse available qualities
        if (data.levels && data.levels.length > 0) {
          const parsedLevels = data.levels.map((level, idx) => ({
            id: idx,
            name: level.height ? `${level.height}p` : `Level ${idx + 1}`
          }));
          setQualityLevels(parsedLevels);
          
          // Respect general user settings quality if manual level was not set
          applyStreamQualitySetting(hls, data.levels);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setStreamMeta(prev => ({
            ...prev,
            resolution: `${level.width}x${level.height} @ ${(level.bitrate / 1000000).toFixed(1)} Mbps`
          }));
          setActiveLevel(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Handle stalled states proactively to prevent buffering freezes
        if (data.details === 'bufferStalledError') {
          console.warn('HLS stall detected, nudging media player.');
          showBufferingWithDelay();
          if (video && video.currentTime > 0) {
            video.currentTime += 0.15;
          }
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('fatal network error, trying to recover...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('fatal media error, trying to recover...', data);
              hls.recoverMediaError();
              break;
            default:
              clearBufferingState();
              setErrorText('Media stream error: Cannot decode channel stream.');
              break;
          }
        }
      });

      // Event listener for buffering status on Hls with active quality auto-reducer on stall
      video.addEventListener('waiting', () => {
        showBufferingWithDelay();
        
        // Auto-downscale or reduce level on stall to guarantee "no buffering playing"
        if (hlsRef.current && hlsRef.current.levels.length > 1) {
          const hls = hlsRef.current;
          const currentLvl = hls.currentLevel; // -1 means auto fallback is running
          
          let targetLvl = currentLvl;
          if (currentLvl === -1) {
            // Adaptive mode. Check what was loaded, downscale from loadLevel
            const activeLoad = hls.loadLevel;
            if (activeLoad > 0) {
              targetLvl = activeLoad - 1;
            } else {
              targetLvl = 0;
            }
          } else if (currentLvl > 0) {
            // Manual mode. Shift down 1 level to avoid freeze
            targetLvl = currentLvl - 1;
          }

          if (targetLvl >= 0 && targetLvl !== currentLvl) {
            console.warn(`Buffer safety active: Reducing level index to ${targetLvl} (${hls.levels[targetLvl]?.height || 'Lower'}p)`);
            hls.currentLevel = targetLvl;
            setActiveLevel(targetLvl);
            setIsAutoReducing(true);
            setAutoReduceNote(`Auto-Optimized resolution due to network lag`);
          }
        }

        const savedTime = video.currentTime;
        setTimeout(() => {
          if (
            videoRef.current && 
            Math.abs(videoRef.current.currentTime - savedTime) < 0.05 && 
            !videoRef.current.paused
          ) {
            console.warn('Standard video stall detected on wait, jumping +0.25s to force sync.');
            videoRef.current.currentTime += 0.25;
          }
        }, 2200);
      });
      
      video.addEventListener('playing', () => {
        clearBufferingState();
        setIsPlaying(true);
      });
    } else {
      setErrorText('Your browser does not support HLS streaming.');
      clearBufferingState();
    }

    return () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.streamUrl, lowLatency, bufferSize]);

  // Handle streamQuality config changes
  useEffect(() => {
    if (hlsRef.current && hlsRef.current.levels.length > 0) {
      applyStreamQualitySetting(hlsRef.current, hlsRef.current.levels);
    }
  }, [streamQuality]);

  const applyStreamQualitySetting = (hls: Hls, levels: any[]) => {
    if (streamQuality === 'auto') {
      hls.currentLevel = -1; // Auto
      setActiveLevel(-1);
    } else {
      // Simple heuristic selection
      let targetIndex = levels.length - 1; // Default to highest
      if (streamQuality === 'low') {
        targetIndex = 0; // lowest
      } else if (streamQuality === 'medium') {
        targetIndex = Math.floor(levels.length / 2);
      }
      hls.currentLevel = targetIndex;
      setActiveLevel(targetIndex);
    }
  };

  const handlePlayError = (e: any) => {
    console.log('Autoplay or play issue, waiting for user click.', e);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(handlePlayError);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const anyOrientation = screen.orientation as any;
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        // Automatically set the screen orientation to landscape for the best Android viewing experience
        if (anyOrientation && anyOrientation.lock) {
          await anyOrientation.lock('landscape').catch(() => {
            // Devices or browsers might ignore locking if not supported
          });
        }
      } else {
        if (anyOrientation && anyOrientation.unlock) {
          try {
            anyOrientation.unlock();
          } catch (e) {}
        }
        await document.exitFullscreen();
      }
    } catch (err: any) {
      console.warn(`Fullscreen toggle info: ${err.message}`);
    }
  };

  const handleManualQualityChange = (levelId: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelId;
    setActiveLevel(levelId);
    setShowQualityMenu(false);
  };

  const cycleAspectRatio = () => {
    startTransition(() => {
      setAspectRatio((prev) => {
        if (prev === 'contain') return 'cover';
        if (prev === 'cover') return 'fill';
        return 'contain';
      });
    });
  };

  const reloadStream = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(true);
    setErrorText(null);

    if (hlsRef.current) {
      hlsRef.current.loadSource(channel.streamUrl);
      hlsRef.current.startLoad();
      video.play().catch(handlePlayError);
    } else {
      video.src = channel.streamUrl;
      video.load();
      video.play().catch(handlePlayError);
    }
  };

  const handlePiPToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      // If already in native picture in picture, exit it
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        return;
      }

      // Try browser standard native picture in picture
      if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        setPipStatusMsg(getTranslation('nativePiPActiveMsg', language));
        setTimeout(() => setPipStatusMsg(null), 4000);
        return;
      }
    } catch (err) {
      console.warn('Native Picture-in-Picture failed. Triggering React overlay fallback.', err);
    }

    // Default graceful fallback to beautiful floating React panel
    setPipStatusMsg(getTranslation('overlayPiPActiveMsg', language));
    setTimeout(() => setPipStatusMsg(null), 5000);
    if (onTogglePiP) {
      onTogglePiP();
    }
  };

  // Determine scaling classes based on aspect ratio setting
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'cover': return 'object-cover w-full h-full';
      case 'fill': return 'object-fill w-full h-full';
      case 'contain':
      default:
        return 'object-contain w-full h-full';
    }
  };

  return (
    <div 
      id="sports-player-container text-sans" 
      ref={containerRef}
      className={`relative w-full aspect-video bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-300 ${controlsVisible ? 'cursor-default' : 'cursor-none'}`}
    >
      {/* Video stream element */}
      <video
        id="live-video-element"
        ref={videoRef}
        className={`${getAspectRatioClass()} bg-black flex-grow w-full h-full`}
        playsInline
        onClick={togglePlay}
        autoPlay
      />

      {/* Picture-in-Picture Feedback Toast */}
      {pipStatusMsg && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-blue-500/50 shadow-xl px-4 py-2 rounded-md text-white text-[10px] font-semibold flex items-center justify-center gap-2 z-40 transition-all duration-300 pointer-events-none text-center max-w-[90%]">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
          <span className="font-sans text-neutral-200 font-medium">{pipStatusMsg}</span>
        </div>
      )}

      {/* Buffering Loading Overlay */}
      {isBuffering && !errorText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300 pointer-events-none">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-2" />
          <span className="text-white text-xs font-medium tracking-widest uppercase">
            Buffering Stream...
          </span>
          <span className="text-slate-400 text-[10px] mt-1 font-mono">
            Optimizing live sports connection
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {errorText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
          <h3 className="text-white text-sm font-semibold mb-1">Playback Interrupted</h3>
          <p className="text-slate-400 text-xs max-w-xs mb-4 leading-relaxed font-sans">{errorText}</p>
          <button
            id="retry-stream-btn"
            onClick={reloadStream}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry Stream
          </button>
        </div>
      )}

      {/* Mini Player Metadata Header */}
      <div className={`absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10 font-sans transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-850 px-2 py-1 rounded-md">
          <ChannelLogo logo={channel.logo} name={channel.name} className="w-5.5 h-5.5 object-contain rounded-xs" fallbackSize="text-xs" />
          <span className="text-[11px] font-bold text-white tracking-wider truncate max-w-[120px]">
            {channel.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-1" />
          <span className="text-[9px] font-bold text-blue-400 font-mono tracking-widest font-mono tracking-widest">LIVE</span>
        </div>

        <div className={`flex items-center gap-2 ${controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <span className="text-[9px] font-mono text-slate-300 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-1.5 py-0.5 rounded">
            {streamMeta.resolution}
          </span>
          <button
            id="reload-manual-btn"
            onClick={reloadStream}
            title="Reload Connection"
            className="p-1 px-1.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Control Bar (Auto Hide after 5 seconds of active playback) */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-8 pb-3 px-3 flex flex-col gap-2 transition-all duration-300 z-20 ${controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        {/* Action Controls Line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              id="player-play-btn"
              onClick={togglePlay}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 transition shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white ml-0.5" />}
            </button>

            {/* Mute and Volume slider */}
            <div className="flex items-center gap-1.5">
              <button
                id="player-mute-btn"
                onClick={toggleMute}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAutoReducing && (
              <span className="text-[9px] text-blue-400 bg-blue-950/80 px-2 py-1 rounded border border-blue-500/20 font-mono animate-pulse uppercase tracking-wider hidden sm:inline" title={autoReduceNote}>
                🛡️ Smooth Play (Auto)
              </span>
            )}

            {/* Aspect Ratio Cycler */}
            <button
              id="player-aspect-ratio"
              onClick={cycleAspectRatio}
              title={`Aspect: ${aspectRatio}`}
              className="text-xs px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-slate-700 transition font-mono whitespace-nowrap"
            >
              {aspectRatio.toUpperCase()}
            </button>

            {/* Quality Selector menu toggle */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <button
                  id="player-quality-btn"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="p-1 px-1.5 flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-medium">
                    {activeLevel === -1 ? 'Auto' : qualityLevels[activeLevel]?.name || 'Manual'}
                  </span>
                </button>

                {/* Quality Flyout menu */}
                {showQualityMenu && (
                  <div className="absolute bottom-8 right-0 bg-slate-950 border border-slate-850 rounded-lg shadow-xl py-1 min-w-[100px] z-50 text-xs flex flex-col">
                    <button
                      id="opt-quality-auto"
                      onClick={() => handleManualQualityChange(-1)}
                      className={`px-3 py-1.5 text-left font-mono hover:bg-slate-800 transition ${activeLevel === -1 ? 'text-blue-400 font-bold bg-slate-900' : 'text-slate-300'}`}
                    >
                      Adaptive
                    </button>
                    {qualityLevels.slice().reverse().map((level) => (
                      <button
                        id={`opt-quality-${level.id}`}
                        key={level.id}
                        onClick={() => handleManualQualityChange(level.id)}
                        className={`px-3 py-1.5 text-left font-mono hover:bg-slate-800 transition ${activeLevel === level.id ? 'text-blue-400 font-bold bg-slate-900' : 'text-slate-300'}`}
                      >
                        {level.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Picture-in-Picture / Popout Toggle button */}
            {onTogglePiP && (
              <button
                id="player-pip-btn"
                onClick={handlePiPToggle}
                title={isNativePiP ? "Exit Picture-in-Picture" : isPiP ? "Dock Player Inline" : "Popout Player (Minimize Proof)"}
                className={`p-1 px-1.5 flex items-center gap-1.5 rounded transition ${isNativePiP ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' : 'text-neutral-300 hover:text-white hover:bg-neutral-800'}`}
              >
                {isNativePiP || isPiP ? <Minimize2 className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                <span className="text-[9px] font-bold font-mono tracking-wide hidden xs:inline">
                  {isNativePiP ? getTranslation('pipActive', language) : isPiP ? getTranslation('pipDock', language) : getTranslation('pipPopout', language)}
                </span>
              </button>
            )}

            {/* Fullscreen Button */}
            {!isPiP && (
              <button
                id="player-fullscreen-btn"
                onClick={toggleFullscreen}
                className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
