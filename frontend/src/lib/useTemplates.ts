import { useCallback, useEffect, useState } from 'react';
import { templateService, type CalculatorTemplate } from '../api';

interface LocalTemplate {
  id: string;
  name: string;
  calculator_key: string;
  description?: string;
  inputs: Record<string, unknown>;
  use_count: number;
  created_at: string;
}

const STORAGE_KEY = 'beaver-templates';

function loadLocal(): LocalTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocal(templates: LocalTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/**
 * Hook providing save-as-template / load-template for any calculator page.
 * Tries API first; falls back to localStorage when offline.
 */
export function useTemplates(calculatorKey: string) {
  const [templates, setTemplates] = useState<(CalculatorTemplate | LocalTemplate)[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await templateService.list(calculatorKey);
      setTemplates(data.templates);
    } catch {
      // Offline — use localStorage
      setTemplates(loadLocal().filter((t) => t.calculator_key === calculatorKey));
    } finally {
      setLoading(false);
    }
  }, [calculatorKey]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = useCallback(
    async (name: string, inputs: Record<string, unknown>, description?: string) => {
      try {
        await templateService.create({ name, calculator_key: calculatorKey, inputs, description });
        fetchTemplates();
      } catch {
        // Offline fallback
        const local = loadLocal();
        local.push({
          id: `local_${Date.now()}`,
          name,
          calculator_key: calculatorKey,
          description,
          inputs,
          use_count: 0,
          created_at: new Date().toISOString(),
        });
        saveLocal(local);
        setTemplates(local.filter((t) => t.calculator_key === calculatorKey));
      }
    },
    [calculatorKey, fetchTemplates],
  );

  const applyTemplate = useCallback(
    async (id: number | string): Promise<Record<string, unknown> | null> => {
      if (typeof id === 'number') {
        try {
          const { data } = await templateService.apply(id);
          return data.inputs;
        } catch {
          return null;
        }
      }
      // Local template
      const local = loadLocal();
      const tmpl = local.find((t) => t.id === id);
      return tmpl?.inputs ?? null;
    },
    [],
  );

  const deleteTemplate = useCallback(
    async (id: number | string) => {
      if (typeof id === 'number') {
        try {
          await templateService.delete(id);
          fetchTemplates();
          return;
        } catch {
          /* fall through */
        }
      }
      // local
      const local = loadLocal().filter((t) => t.id !== id);
      saveLocal(local);
      setTemplates(local.filter((t) => t.calculator_key === calculatorKey));
    },
    [calculatorKey, fetchTemplates],
  );

  return { templates, loading, saveTemplate, applyTemplate, deleteTemplate };
}
