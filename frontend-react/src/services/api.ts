import axios from 'axios';
import type {
  User, Listing, Workshop, Container, ContainerRequest,
  Category, Notification, Invoice, AdminStats, AuthResponse
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
};

// Users
export const userService = {
  getAll: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) =>
    api.get<{ users: User[]; total: number; page: number; limit: number }>('/admin/users', { params }),
  getOne: (id: number) => api.get<User>(`/admin/users/${id}`),
  create: (data: Partial<User> & { password: string }) => api.post<User>('/admin/users', data),
  update: (id: number, data: Partial<User>) => api.put<User>(`/admin/users/${id}`, data),
  delete: (id: number) => api.delete(`/admin/users/${id}`),
};

// Listings
export const listingService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; category?: string; type?: string; search?: string }) =>
    api.get<{ listings: Listing[]; total: number; page: number; limit: number }>('/listings', { params }),
  getAdminAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<{ listings: Listing[]; total: number; page: number; limit: number }>('/admin/listings', { params }),
  getOne: (id: number) => api.get<Listing>(`/listings/${id}`),
  create: (data: Partial<Listing>) => api.post<Listing>('/listings', data),
  validate: (id: number) => api.put(`/listings/${id}/validate`),
  reject: (id: number, reason: string) => api.put(`/listings/${id}/reject`, { reason }),
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
  book: (id: number) => api.post(`/workshops/${id}/book`),
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

export default api;
