import axios from 'axios'

const adminAxios = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

adminAxios.interceptors.request.use(config => {
  const key = sessionStorage.getItem('sf_admin_key')
  if (key) config.headers['X-Admin-Key'] = key
  return config
})

export function adminLogin(password: string) {
  return adminAxios.post('/admin/login', { password })
}

export function setAdminKey(key: string) {
  sessionStorage.setItem('sf_admin_key', key)
}

export function clearAdminKey() {
  sessionStorage.removeItem('sf_admin_key')
}

export function isAdminAuthenticated() {
  return !!sessionStorage.getItem('sf_admin_key')
}

export const adminApi = {
  getDashboard: () => adminAxios.get('/admin/dashboard'),
  getUsers: (page = 1, pageSize = 20) => adminAxios.get(`/admin/users?page=${page}&page_size=${pageSize}`),
  getUser: (userId: string) => adminAxios.get(`/admin/users/${userId}`),
  updateUserRole: (userId: string, role: string) => adminAxios.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId: string) => adminAxios.delete(`/admin/users/${userId}`),

  getResumes: (page = 1) => adminAxios.get(`/admin/resumes?page=${page}`),
  getRoadmaps: (page = 1) => adminAxios.get(`/admin/roadmaps?page=${page}`),
  getQuizzes: (page = 1) => adminAxios.get(`/admin/quizzes?page=${page}`),
  getInterviews: (page = 1) => adminAxios.get(`/admin/interviews?page=${page}`),

  getAIUsage: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return adminAxios.get(`/admin/ai-usage${qs}`)
  },
  getAIUsageByModel: () => adminAxios.get('/admin/ai-usage/by-model'),
  getAIUsageByFeature: () => adminAxios.get('/admin/ai-usage/by-feature'),
  getAIUsageByUser: (page = 1) => adminAxios.get(`/admin/ai-usage/by-user?page=${page}`),
  getAIUsageTimeline: (days = 30) => adminAxios.get(`/admin/ai-usage/timeline?days=${days}`),
  getAIUsageLive: (minutes = 5) => adminAxios.get(`/admin/ai-usage/live?minutes=${minutes}`),

  getAuditLogs: (page = 1) => adminAxios.get(`/admin/audit-logs?page=${page}`),
  getSystem: () => adminAxios.get('/admin/system'),

  getAIConfig: () => adminAxios.get('/admin/ai-config'),
  setAIModel: (model: string) => adminAxios.patch('/admin/ai-config', { model }),
}
