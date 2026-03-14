import apiClient from './client';

export interface CalculatorTemplate {
  id: number;
  name: string;
  calculator_key: string;
  description?: string;
  inputs: Record<string, unknown>;
  use_count: number;
  created_by?: string;
  created_at: string;
}

export interface CreateTemplatePayload {
  name: string;
  calculator_key: string;
  inputs: Record<string, unknown>;
  description?: string;
  project_id?: number;
}

export const templateService = {
  list(calculatorKey?: string) {
    const params = calculatorKey ? { calculator: calculatorKey } : undefined;
    return apiClient.get<{ templates: CalculatorTemplate[] }>('/templates', { params });
  },
  create(payload: CreateTemplatePayload) {
    return apiClient.post<{ template: { id: number; name: string } }>('/templates', payload);
  },
  delete(id: number) {
    return apiClient.delete(`/templates/${id}`);
  },
  apply(id: number) {
    return apiClient.post<{ calculator_key: string; inputs: Record<string, unknown> }>(
      `/templates/${id}/apply`,
    );
  },
};
