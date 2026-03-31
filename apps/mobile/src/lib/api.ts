import axios from "axios";
import * as SecureStore from "expo-secure-store";

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
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
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
