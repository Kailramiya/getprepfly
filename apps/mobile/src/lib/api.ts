import axios from "axios";
import * as SecureStore from "expo-secure-store";

/**
 * ⚠️ PRE-RELEASE — NOT PRODUCTION READY ⚠️
 *
 * This mobile client is an MVP scaffold and its auth is NOT wired to the
 * backend. The web backend authenticates with NextAuth *cookie sessions*; this
 * client expects *bearer tokens* and calls POST /api/auth/login, which does not
 * exist. The production app ships as a PWA (native apps are "Coming Soon").
 *
 * To make this app functional, the backend needs a token-based auth path:
 *   1. A POST /api/auth/mobile-login route that verifies credentials and
 *      returns a signed JWT.
 *   2. Bearer-token acceptance in lib/auth-utils (requireAuth) alongside the
 *      existing cookie-session check.
 * Until then, login is intentionally disabled below so it fails clearly.
 */
const MOBILE_BACKEND_AUTH_READY = false;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
      // Navigation to login handled by auth state
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => {
    if (!MOBILE_BACKEND_AUTH_READY) {
      return Promise.reject(
        new Error(
          "Mobile login is not available yet. The mobile app is pre-release — please use the web app at " +
            API_BASE +
            "."
        )
      );
    }
    return api.post("/auth/mobile-login", { email, password });
  },
  register: (data: { name: string; email: string; password: string; phone?: string; centreSlug?: string }) =>
    api.post("/auth/register", data),
};

// Questions
export const questionsApi = {
  list: (params: Record<string, string>) =>
    api.get("/questions", { params }),
  get: (id: string) =>
    api.get(`/questions/${id}`),
};

// Attempts
export const attemptsApi = {
  submit: (data: any) =>
    api.post("/attempts", data),
  list: (params?: Record<string, string>) =>
    api.get("/attempts", { params }),
};

// Mock Tests
export const mockTestsApi = {
  list: () => api.get("/mock-tests"),
  create: () => api.post("/mock-tests"),
  get: (id: string) => api.get(`/mock-tests/${id}`),
  update: (id: string, data: any) => api.patch(`/mock-tests/${id}`, data),
};

// AI Scoring
export const aiApi = {
  scoreSpeaking: (data: any) => api.post("/ai/score-speaking", data),
  scoreWriting: (data: any) => api.post("/ai/score-writing", data),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get("/dashboard"),
};

export default api;
