import React, { useState } from 'react';
import { FiCheck, FiSave } from 'react-icons/fi';
import { useRunHistory } from '../../lib/useRunHistory';

interface SaveRunButtonProps {
  calculatorKey: string;
  inputs: Record<string, string | number>;
  results: Record<string, any> | null;
  status?: string;
  summary?: string;
  className?: string;
}

/**
 * Drop-in button that saves the current inputs + results as a "Run"
 * for later comparison via the Compare Runs page.
 */
const SaveRunButton: React.FC<SaveRunButtonProps> = ({
  calculatorKey,
  inputs,
  results,
  status,
  summary,
  className = '',
}) => {
  const { saveRun } = useRunHistory(calculatorKey);
  const [saved, setSaved] = useState(false);
  const [label, setLabel] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSave = () => {
    if (!results) return;
    const runLabel = label.trim() || `Run ${new Date().toLocaleString()}`;
    saveRun(runLabel, inputs, results, { status, summary });
    setSaved(true);
    setShowInput(false);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!results) return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showInput && (
        <input
          type="text"
          placeholder="Run label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
          autoFocus
        />
      )}
      <button
        onClick={() => (showInput ? handleSave() : setShowInput(true))}
        disabled={saved}
        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
          saved
            ? 'bg-emerald-700 text-emerald-100'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {saved ? <FiCheck size={13} /> : <FiSave size={13} />}
        {saved ? 'Saved' : 'Save Run'}
      </button>
    </div>
  );
};

export default SaveRunButton;
