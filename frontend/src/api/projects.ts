import apiClient from "./client";

export interface Project {
  id: number;
  name: string;
  description?: string;
  client?: string;
  project_number?: string;
  status?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  client?: string;
  project_number?: string;
}

export const projectService = {
  list() {
    return apiClient.get<{ projects: Project[] }>("/projects");
  },

  get(id: number) {
    return apiClient.get<{ project: Project }>(`/projects/${id}`);
  },

  create(payload: CreateProjectPayload) {
    return apiClient.post<{ project: Project }>("/projects", payload);
  },

  update(id: number, payload: Partial<CreateProjectPayload>) {
    return apiClient.put<{ project: Project }>(`/projects/${id}`, payload);
  },

  delete(id: number) {
    return apiClient.delete(`/projects/${id}`);
  },
};
