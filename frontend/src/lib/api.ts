import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Standardize error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error?.message ||
      err.response?.data?.detail ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

export default api

// ── Auth ─────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api.post('/auth/register', { email, password, full_name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  updateProfile: (data: { full_name?: string; email?: string }) =>
    api.post('/auth/profile', data),
}

// ── Profile & Preferences ────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: {
    full_name?: string
    bio?: string
    location?: string
    linkedin_url?: string
    github_url?: string
    website_url?: string
  }) => api.patch('/profile', data),
  getPreferences: () => api.get('/career-preferences'),
  savePreferences: (target_role: string, timeline_months: number, weekly_hours: number) =>
    api.put('/career-preferences', { target_role, timeline_months, weekly_hours }),
}

// ── Resume ───────────────────────────────────────────────
export const resumeApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/resumes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded / (e.total || 1)) * 100)),
    })
  },
  getStatus: (id: string) => api.get(`/resumes/${id}`),
  getAnalysis: (id: string) => api.get(`/resumes/${id}/analysis`),
  getLatestStatus: () => api.get('/resumes/latest/status'),
}

// ── Skills ───────────────────────────────────────────────
export const skillsApi = {
  getSkills: () => api.get('/skills'),
  getProjects: () => api.get('/projects'),
  getExperience: () => api.get('/experience'),
}

// ── Gap Analysis ─────────────────────────────────────────
export const gapApi = {
  generate: () => api.post('/gap-analysis/generate'),
  get: () => api.get('/gap-analysis'),
}

// ── Roadmap ──────────────────────────────────────────────
export const roadmapApi = {
  generate: () => api.post('/roadmaps/generate'),
  getCurrent: () => api.get('/roadmaps/current'),
  getWeeks: (roadmapId: string) => api.get(`/roadmaps/${roadmapId}/weeks`),
  getWeek: (weekId: string) => api.get(`/roadmaps/weeks/${weekId}`),
  updateTask: (taskId: string, completed: boolean) =>
    api.patch(`/roadmaps/tasks/${taskId}`, { completed }),
}

// ── Quiz ─────────────────────────────────────────────────
export const quizApi = {
  getOrCreate: (weekId: string) => api.post(`/weeks/${weekId}/quiz`),
  submit: (quizId: string, answers: number[]) =>
    api.post(`/quizzes/${quizId}/submit`, { answers }),
}

// ── Interview ────────────────────────────────────────────
export const interviewApi = {
  getQuestions: (category?: string) =>
    api.get('/interview/questions', { params: category ? { category } : {} }),
  answer: (questionId: string, answer: string) =>
    api.post(`/interview/questions/${questionId}/answer`, { answer }),
}

// ── Project Recommendations ──────────────────────────────
export const projectRecsApi = {
  get: (refresh = false) => api.get(`/projects-recommended${refresh ? '?refresh=true' : ''}`),
}

// ── Dashboard ────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard'),
}
