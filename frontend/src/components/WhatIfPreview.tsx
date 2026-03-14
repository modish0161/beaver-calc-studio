import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { FiEye, FiMaximize2, FiMinimize2, FiSliders } from 'react-icons/fi';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface WhatIfSlider {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

interface WhatIfPreviewProps {
  title: string;
  renderScene: (height: string) => React.ReactNode;
  sliders: WhatIfSlider[];
  form: Record<string, any>;
  updateForm: (key: any, value: string) => void;
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
  liveReadout?: Array<{ label: string; value: number }>;
  onMaximize?: () => void;
}

export default function WhatIfPreview({
  title,
  renderScene,
  sliders,
  form,
  updateForm,
  status,
  utilisation,
  liveReadout,
  onMaximize,
}: WhatIfPreviewProps) {
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [maximized, setMaximized] = useState(false);

  return (
    <>
      <Card className="bg-gray-900/50 border-gray-800 sticky top-24">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiEye className="text-cyan-400" />
              <span>{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWhatIfMode(!whatIfMode)}
                className={cn(
                  'p-2 rounded-lg transition-all duration-300 text-xs font-bold flex items-center gap-1',
                  whatIfMode
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white'
                )}
                title="Toggle What-If Explorer"
              >
                <FiSliders size={14} />
                <span className="hidden sm:inline">What-If</span>
              </button>
              <button
                onClick={() => onMaximize ? onMaximize() : setMaximized(true)}
                className="p-2 rounded-lg bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white transition-all"
                title="Fullscreen Preview"
              >
                <FiMaximize2 size={14} />
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {renderScene('h-[350px]')}

          <AnimatePresence>
            {whatIfMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 p-3 rounded-lg bg-gray-900/60 border border-cyan-500/30"
              >
                <div className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
                  <FiSliders size={12} /> What-If Explorer
                </div>
                {sliders.map((s) => (
                  <div key={s.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="text-white font-mono">
                        {form[s.key]} {s.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={parseFloat(form[s.key]) || s.min}
                      onChange={(e) => updateForm(s.key, e.target.value)}
                      title={s.label}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                ))}
                {liveReadout && liveReadout.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-gray-700/50">
                    {liveReadout.map((c) => (
                      <div key={c.label} className="text-center">
                        <div
                          className={cn(
                            'text-xs font-bold',
                            c.value > 100 ? 'text-red-400' : c.value > 90 ? 'text-amber-400' : 'text-green-400'
                          )}
                        >
                          {c.value.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-gray-500">{c.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {!onMaximize && maximized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-950/95 flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <FiEye className="text-cyan-400" size={20} />
              <span className="text-white font-bold text-lg">{title}</span>
              {status && utilisation != null && (
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold',
                    status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {status} — {utilisation.toFixed(0)}%
                </span>
              )}
            </div>
            <button
              onClick={() => setMaximized(false)}
              title="Minimise preview"
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-all"
            >
              <FiMinimize2 size={20} />
            </button>
          </div>

          <div className="flex-1 flex">
            <div className="flex-1">{renderScene('h-full')}</div>
            <div className="w-80 bg-gray-900/80 border-l border-gray-800 p-4 overflow-y-auto space-y-4">
              <div className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <FiSliders size={14} /> What-If Explorer
              </div>
              {sliders.map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{s.label}</span>
                    <span className="text-white font-mono">
                      {form[s.key]} {s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={parseFloat(form[s.key]) || s.min}
                    onChange={(e) => updateForm(s.key, e.target.value)}
                    title={s.label}
                    className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              ))}
              {liveReadout && liveReadout.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase">Live Results</div>
                  {liveReadout.map((c) => (
                    <div key={c.label} className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              c.value > 100 ? 'bg-red-500' : c.value > 90 ? 'bg-amber-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(c.value, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-xs font-bold w-12 text-right',
                            c.value > 100 ? 'text-red-400' : c.value > 90 ? 'text-amber-400' : 'text-green-400'
                          )}
                        >
                          {c.value.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
