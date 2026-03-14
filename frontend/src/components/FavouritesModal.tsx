import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { FiStar, FiTrash2, FiX, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useFavourites } from '../lib/useFavourites';

// ============================================================================
// Favourites Modal — View and manage favourited calculators
// ============================================================================

interface FavouritesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FavouritesModal: React.FC<FavouritesModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { favourites, removeFavourite, clearFavourites } = useFavourites();

  const handleNavigate = (key: string) => {
    onClose();
    navigate(`/calculator/${key}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] max-h-[80vh] z-50"
          >
            <div className="bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
                <div className="flex items-center gap-3">
                  <FiStar className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Favourites
                    {favourites.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        ({favourites.length})
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {favourites.length > 0 && (
                    <button
                      onClick={clearFavourites}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    title="Close favourites"
                    aria-label="Close favourites"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {favourites.length === 0 ? (
                  <div className="py-12 text-center">
                    <FiStar className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 text-sm">No favourites yet</p>
                    <p className="text-slate-500 text-xs mt-2">
                      Click the star icon on any calculator to add it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favourites.map((fav) => (
                      <motion.div
                        key={fav.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/30 hover:border-slate-600/50 transition-all cursor-pointer"
                        onClick={() => handleNavigate(fav.key)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FiStar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {fav.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {fav.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(fav.key);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Open calculator"
                          >
                            <FiExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavourite(fav.key);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Remove from favourites"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {favourites.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-700/60 bg-slate-800/30">
                  <p className="text-xs text-slate-500 text-center">
                    Click any calculator to open it • Favourites sync locally
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FavouritesModal;
