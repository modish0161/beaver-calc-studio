import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

/** Base URL for the backend server (no trailing /api) */
const SERVER_URL =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "") || "";

/** Client for /api/* endpoints (calculators, runs, projects) */
const apiClient = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/** Client for /auth/* endpoints (login, register, profile) */
export const authClient = axios.create({
  baseURL: `${SERVER_URL}/auth`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

function attachToken(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem("beaver-token");
  if (token && token !== "offline") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

function handleAuthError(
  error: AxiosError<{ error?: string; message?: string }>,
) {
  if (error.response?.status === 401) {
    localStorage.removeItem("beaver-token");
    localStorage.removeItem("beaver-user");
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
  const message =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    "An unexpected error occurred";
  return Promise.reject(new Error(message));
}

// Apply interceptors to both clients
for (const client of [apiClient, authClient]) {
  client.interceptors.request.use(attachToken, (e) => Promise.reject(e));
  client.interceptors.response.use((r) => r, handleAuthError);
}

export default apiClient;
