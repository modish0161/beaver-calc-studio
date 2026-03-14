import apiClient from "./client";

export interface CalculatorInput {
  [key: string]: number | string | boolean;
}

export interface CalculatorResult {
  calculator: string;
  inputs: CalculatorInput;
  results: Record<string, number | string | boolean>;
  warnings?: string[];
  timestamp: string;
}

export interface CalculatorRun {
  id: number;
  run_id: string;
  calculator_key: string;
  inputs: CalculatorInput;
  results: Record<string, unknown>;
  status: string;
  created_at: string;
  completed_at?: string;
  project_id?: number;
  project_name?: string;
}

export const calculatorService = {
  /** Run a calculation on the backend (server-side compute) */
  compute(calculatorKey: string, projectId: number, inputs: CalculatorInput) {
    return apiClient.post<{ run: CalculatorRun }>("/runs", {
      calculator: calculatorKey,
      project_id: projectId,
      inputs,
    });
  },

  /** Store a pre-computed run (frontend local calc → backend audit trail) */
  syncRun(
    calculatorKey: string,
    inputs: Record<string, unknown>,
    results: Record<string, unknown>,
    projectId?: number,
    metadata?: Record<string, unknown>,
  ) {
    return apiClient.post<{ run: CalculatorRun }>("/runs/sync", {
      calculator: calculatorKey,
      inputs,
      results,
      project_id: projectId,
      metadata,
    });
  },

  /** Fetch available calculator definitions */
  list() {
    return apiClient.get<{ calculators: unknown[] }>("/calculators");
  },

  /** Get calculation history for current user */
  getHistory(calculatorKey?: string) {
    const params: Record<string, string | number> = {};
    if (calculatorKey) params.calculator = calculatorKey;
    return apiClient.get<{ runs: CalculatorRun[]; total: number }>("/runs", {
      params,
    });
  },

  /** Get a specific run by run_id */
  getRun(runId: string) {
    return apiClient.get<{ run: CalculatorRun }>(`/runs/${runId}`);
  },
};
