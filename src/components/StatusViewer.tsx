import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Store, MessageSquare } from 'lucide-react';

interface StatusViewerProps {
  statusGroups: any[];
  initialGroupIndex: number;
  onClose: () => void;
  onVisitStore: (storeId: string) => void;
}

const StatusViewer: React.FC<StatusViewerProps> = ({ statusGroups, initialGroupIndex, onClose, onVisitStore }) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [updateIndex, setUpdateIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = statusGroups[groupIndex];
  const currentUpdate = currentGroup?.updates[updateIndex];

  useEffect(() => {
    if (!currentUpdate) return;
    
    setProgress(0);
    
    if (currentUpdate.media_type === 'video') {
      // Video progress is handled by timeupdate event
      return;
    }

    // Image/Text progress
    if (isPaused) return;

    const DURATION = 5000; // 5 seconds per status
    const interval = 50;
    const step = (interval / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [groupIndex, updateIndex, isPaused, currentUpdate]);

  const handleNext = () => {
    if (updateIndex < currentGroup.updates.length - 1) {
      setUpdateIndex(prev => prev + 1);
    } else if (groupIndex < statusGroups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setUpdateIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (updateIndex > 0) {
      setUpdateIndex(prev => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      setUpdateIndex(statusGroups[groupIndex - 1].updates.length - 1);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      setProgress((currentTime / duration) * 100);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  if (!currentGroup || !currentUpdate) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        {/* Navigation Areas */}
        <div 
          className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer"
          onClick={handlePrev}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        />
        <div 
          className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer"
          onClick={handleNext}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        />
        <div 
          className="absolute inset-y-0 left-1/3 right-1/3 z-10 cursor-pointer"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        />

        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
          {currentGroup.updates.map((_: any, idx: number) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ 
                  width: idx < updateIndex ? '100%' : idx === updateIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
              {currentGroup.authorImage ? (
                <img src={currentGroup.authorImage} alt={currentGroup.authorName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold">
                  {currentGroup.authorName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{currentGroup.authorName}</p>
              <p className="text-white/70 text-xs">
                {new Date(currentUpdate.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white bg-black/20 rounded-full backdrop-blur-sm z-30 relative"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="w-full h-full max-w-md mx-auto relative flex items-center justify-center bg-gray-900">
          {currentUpdate.media_type === 'video' ? (
            <video 
              ref={videoRef}
              src={currentUpdate.media_url} 
              autoPlay 
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
            />
          ) : currentUpdate.media_type === 'image' ? (
            <img 
              src={currentUpdate.media_url} 
              alt="Status" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-emerald-900 to-gray-900">
              <p className="text-white text-2xl font-bold text-center whitespace-pre-wrap">
                {currentUpdate.text}
              </p>
            </div>
          )}

          {/* Text Overlay for Media */}
          {currentUpdate.media_type !== 'none' && currentUpdate.text && (
            <div className="absolute bottom-24 left-4 right-4 p-4 bg-black/50 backdrop-blur-md rounded-2xl">
              <p className="text-white font-medium text-sm whitespace-pre-wrap">
                {currentUpdate.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!currentGroup.isGlobal && (
          <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onVisitStore(currentGroup.authorId);
                onClose();
              }}
              className="px-6 py-3 bg-white text-gray-900 rounded-full font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-xl"
            >
              <Store size={18} />
              Visit Store
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusViewer;
