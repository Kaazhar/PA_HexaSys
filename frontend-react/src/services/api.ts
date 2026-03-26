import axios from 'axios';
import type {
  User, Listing, Workshop, Container, ContainerRequest,
  Category, Notification, Invoice, AdminStats, AuthResponse,
  Subscription, Project, Conversation, Message, Review, SearchResults
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstname: string; lastname: string; role: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
  updateProfile: (data: { firstname?: string; lastname?: string; phone?: string; address?: string }) =>
    api.put<User>('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/password', data),
  confirmEmail: (email: string, code: string) => api.post('/auth/confirm-email', { email, code }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const newsletterService = {
  toggle: (subscribed: boolean) => api.put('/newsletter', { subscribed }),
  send: (subject: string, content: string) => api.post('/admin/newsletter', { subject, content }),
};

// Users
export const userService = {
  getAll: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) =>
    api.get<{ users: User[]; total: number; page: number; limit: number }>('/admin/users', { params }),
  getOne: (id: number) => api.get<User>(`/admin/users/${id}`),
  getPublicProfile: (id: number) => api.get(`/users/${id}`),
  create: (data: Partial<User> & { password: string }) => api.post<User>('/admin/users', data),
  update: (id: number, data: Partial<User>) => api.put<User>(`/admin/users/${id}`, data),
  delete: (id: number) => api.delete(`/admin/users/${id}`),
  ban: (id: number, data: { reason: string; duration: number; is_permanent: boolean }) =>
    api.post(`/admin/users/${id}/ban`, data),
  unban: (id: number) => api.post(`/admin/users/${id}/unban`),
  getBanHistory: (id: number) => api.get(`/admin/users/${id}/bans`),
};

// Listings
export const listingService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; category?: string; type?: string; search?: string }) =>
    api.get<{ listings: Listing[]; total: number; page: number; limit: number }>('/listings', { params }),
  getMine: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ listings: Listing[]; total: number; page: number; limit: number }>('/listings/mine', { params }),
  getAdminAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<{ listings: Listing[]; total: number; page: number; limit: number }>('/admin/listings', { params }),
  getOne: (id: number) => api.get<Listing>(`/listings/${id}`),
  create: (data: Partial<Listing>) => api.post<Listing>('/listings', data),
  update: (id: number, data: Partial<Listing>) => api.put<Listing>(`/listings/${id}`, data),
  validate: (id: number) => api.put(`/listings/${id}/validate`),
  reject: (id: number, reason: string) => api.put(`/listings/${id}/reject`, { reason }),
  markSold: (id: number) => api.put(`/listings/${id}/sold`),
  delete: (id: number) => api.delete(`/listings/${id}`),
};

// Workshops
export const workshopService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    api.get<{ workshops: Workshop[]; total: number; page: number; limit: number }>('/workshops', { params }),
  getAdminAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ workshops: Workshop[]; total: number; page: number; limit: number }>('/admin/workshops', { params }),
  getOne: (id: number) => api.get<Workshop>(`/workshops/${id}`),
  create: (data: Partial<Workshop>) => api.post<Workshop>('/workshops', data),
  update: (id: number, data: Partial<Workshop>) => api.put<Workshop>(`/workshops/${id}`, data),
  validate: (id: number) => api.put(`/workshops/${id}/validate`),
  cancel: (id: number, reason: string) => api.put(`/workshops/${id}/cancel`, { reason }),
  delete: (id: number) => api.delete(`/workshops/${id}`),
  book: (id: number) => api.post(`/workshops/${id}/book`),
  checkEnrollment: () => api.post('/workshops/check-enrollment'),
};

// SIRET (professionnels)
export const siretService = {
  verify: (siret: string) => api.post('/pro/verify-siret', { siret }),
  getStatus: () => api.get('/pro/siret-status'),
  getCompanyInfo: () => api.get('/pro/company-info'),
  getCompanyBySiret: (siret: string) => api.get(`/companies/${siret}`),
};

// Categories
export const categoryService = {
  getAll: () => api.get<Category[]>('/categories'),
  create: (data: Partial<Category>) => api.post<Category>('/categories', data),
  update: (id: number, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

// Containers
export const containerService = {
  getAll: () => api.get<Container[]>('/containers'),
  getOne: (id: number) => api.get<Container>(`/containers/${id}`),
  create: (data: Partial<Container>) => api.post<Container>('/containers', data),
  update: (id: number, data: Partial<Container>) => api.put<Container>(`/containers/${id}`, data),
  getRequests: (params?: { status?: string }) =>
    api.get<ContainerRequest[]>('/containers/requests', { params }),
  createRequest: (data: { container_id: number; object_title: string; object_description: string; desired_date: string }) =>
    api.post<ContainerRequest>('/containers/requests', data),
  validateRequest: (id: number) => api.put(`/containers/requests/${id}/validate`),
  rejectRequest: (id: number, reason: string) => api.put(`/containers/requests/${id}/reject`, { reason }),
};

// Score
export const scoreService = {
  getMyScore: () => api.get('/score/me'),
};

// Notifications
export const notificationService = {
  getAll: () => api.get<Notification[]>('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
};

// Admin stats
export const adminService = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getFinance: () => api.get('/admin/finance'),
  getInvoices: (params?: { status?: string }) => api.get<Invoice[]>('/admin/invoices', { params }),
};

// Dashboards
export const dashboardService = {
  getParticulier: () => api.get('/particulier/dashboard'),
  getPro: () => api.get('/pro/dashboard'),
  getSalarie: () => api.get('/salarie/dashboard'),
};

// Salarié
export const salarieService = {
  getMyWorkshops: (params?: { status?: string }) => api.get('/salarie/workshops', { params }),
  getMyArticles: () => api.get('/salarie/articles'),
  createArticle: (data: { title: string; content: string; tags?: string; status?: string }) =>
    api.post('/salarie/articles', data),
  updateArticle: (id: number, data: Partial<{ title: string; content: string; tags: string; status: string }>) =>
    api.put(`/salarie/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete(`/salarie/articles/${id}`),
};

// Subscription
export const subscriptionService = {
  getMy: () => api.get<Subscription>('/subscription'),
  upgrade: (plan: string) => api.post<Subscription>('/subscription/upgrade', { plan }),
};

// Projects
export const projectService = {
  getAll: (params?: { search?: string }) => api.get<Project[]>('/projects', { params }),
  getMine: () => api.get<Project[]>('/pro/projects'),
  create: (data: Partial<Project>) => api.post<Project>('/pro/projects', data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/pro/projects/${id}`, data),
  delete: (id: number) => api.delete(`/pro/projects/${id}`),
};

// Messages
export const messageService = {
  getConversations: () => api.get<Conversation[]>('/conversations'),
  getOrCreate: (data: { other_user_id: number; listing_id?: number }) =>
    api.post<Conversation>('/conversations', data),
  getMessages: (conversationId: number) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),
  send: (conversationId: number, content: string) =>
    api.post<Message>(`/conversations/${conversationId}/messages`, { content }),
};

// Reviews
export const reviewService = {
  getForListing: (listingId: number) => api.get<Review[]>(`/listings/${listingId}/reviews`),
  getForUser: (userId: number) => api.get(`/users/${userId}/reviews`),
  create: (listingId: number, data: { rating: number; comment: string }) =>
    api.post<Review>(`/listings/${listingId}/reviews`, data),
  delete: (id: number) => api.delete(`/reviews/${id}`),
};

// Reports
export const reportService = {
  create: (listingId: number, data: { reason: string; details?: string }) =>
    api.post(`/listings/${listingId}/report`, data),
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ reports: any[]; total: number; page: number; limit: number }>('/admin/reports', { params }),
  resolve: (id: number, data: { status: string; admin_note?: string }) =>
    api.put(`/admin/reports/${id}/resolve`, data),
};

// Search
export const searchService = {
  global: (q: string) => api.get<SearchResults>('/search', { params: { q } }),
};

export const uploadService = {
  upload: (file: File): Promise<{ data: { url: string } }> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
