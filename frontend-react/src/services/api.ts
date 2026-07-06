import axios from 'axios';
import type {
  User, Listing, Workshop, WorkshopBooking, Container, ContainerRequest, ContainerSlot,
  Category, Notification, Invoice, AdminStats, AuthResponse, AvailableObject,
  Subscription, SubscriptionPlan, Project, ProjectUpdate, ProjectDetail, Conversation, Message, Review, SearchResults,
  ForumTopic, ForumPost, Article
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
    if (error.response?.status === 403 && error.response?.data?.ban_reason !== undefined) {
      window.location.href = '/compte-bloque';
    }
    return Promise.reject(error);
  }
);

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
  updateAvatar: (avatarUrl: string) =>
    api.put<User>('/auth/avatar', { avatar_url: avatarUrl }),
  updateBanner: (data: { banner_url?: string; banner_color?: string }) =>
    api.put<User>('/auth/banner', data),
  confirmEmail: (email: string, code: string) => api.post('/auth/confirm-email', { email, code }),
  resendConfirmEmail: (email: string) => api.post('/auth/resend-confirm', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verify2FA: (userId: number, code: string) =>
    api.post<{ token: string; user: User }>('/auth/verify-2fa', { user_id: userId, code }),
  resend2FA: (userId: number) =>
    api.post('/auth/resend-2fa', { user_id: userId }),
  toggleEmail2FA: (enabled: boolean) =>
    api.post<{ message: string; user: User }>('/auth/toggle-email-2fa', { enabled }),
  googleConfig: () => api.get<{ client_id: string }>('/auth/google-config'),
  googleLogin: (credential: string) =>
    api.post<{ token: string; user: User }>('/auth/google', { credential }),
};

export const phoneService = {
  sendCode: (phone: string) =>
    api.post('/phone/send-code', { phone }),
  verify: (phone: string, code: string) =>
    api.post<{ message: string; user: User }>('/phone/verify', { phone, code }),
  toggle2FA: (enabled: boolean) =>
    api.post<{ message: string; user: User }>('/phone/toggle-2fa', { enabled }),
};

export const newsletterService = {
  toggle: (subscribed: boolean) => api.put('/newsletter', { subscribed }),
  send: (subject: string, content: string) => api.post('/admin/newsletter', { subject, content }),
};

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
  resetEmail2FA: (id: number) => api.put(`/admin/users/${id}/reset-email-2fa`),
};

export const listingService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; category?: string; type?: string; search?: string; location?: string }) =>
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
  sponsor: (id: number, isSponsored: boolean) => api.put(`/listings/${id}/sponsor`, { is_sponsored: isSponsored }),
  boost: (id: number) => api.post<{ free?: boolean; sponsored_until?: string; checkout_url?: string }>(`/listings/${id}/boost`),
  delete: (id: number) => api.delete(`/listings/${id}`),
};

export const workshopService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    api.get<{ workshops: Workshop[]; total: number; page: number; limit: number }>('/workshops', { params }),
  getAdminAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ workshops: Workshop[]; total: number; page: number; limit: number }>('/admin/workshops', { params }),
  getOne: (id: number) => api.get<Workshop>(`/workshops/${id}`),
  create: (data: WorkshopCreatePayload) => api.post<Workshop>('/workshops', data),
  update: (id: number, data: Partial<Workshop>) => api.put<Workshop>(`/workshops/${id}`, data),
  validate: (id: number) => api.put(`/workshops/${id}/validate`),
  cancel: (id: number, reason: string) => api.put(`/workshops/${id}/cancel`, { reason }),
  delete: (id: number) => api.delete(`/workshops/${id}`),
  book: (id: number) => api.post(`/workshops/${id}/book`),
  getBookings: (id: number) =>
    api.get<{ participants: WorkshopParticipant[]; count: number; max_spots: number }>(`/workshops/${id}/bookings`),
  checkEnrollment: () => api.post('/workshops/check-enrollment'),
};

export interface WorkshopParticipant {
  firstname: string;
  lastname: string;
  booked_at: string;
}

export interface WorkshopCreatePayload {
  title: string;
  description?: string;
  objective?: string;
  date?: string;
  duration?: number;
  location?: string;
  price?: number;
  max_spots?: number;
  min_spots?: number;
  category_id?: number;
  type?: string;
  image?: string;
  sessions?: { date: string; duration: number }[];
  chapters?: { title: string; content: string }[];
}

export const siretService = {
  verify: (siret: string) => api.post('/pro/verify-siret', { siret }),
  getStatus: () => api.get('/pro/siret-status'),
  getCompanyInfo: () => api.get('/pro/company-info'),
  getCompanyBySiret: (siret: string) => api.get(`/companies/${siret}`),
};

export const categoryService = {
  getAll: () => api.get<Category[]>('/categories'),
  create: (data: Partial<Category>) => api.post<Category>('/categories', data),
  update: (id: number, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const containerService = {
  getAll: () => api.get<Container[]>('/containers'),
  getOne: (id: number) => api.get<Container>(`/containers/${id}`),
  create: (data: Partial<Container>) => api.post<Container>('/containers', data),
  update: (id: number, data: Partial<Container>) => api.put<Container>(`/containers/${id}`, data),
  getSlots: (id: number) => api.get<ContainerSlot[]>('/containers/slots', { params: { container_id: id } }),
  seedSlots: (id: number, counts: { S: number; M: number; L: number }) =>
    api.post<ContainerSlot[]>(`/containers/${id}/slots`, counts),
  getRequests: (params?: { status?: string }) =>
    api.get<ContainerRequest[]>('/containers/requests', { params }),
  createRequest: (data: {
    container_id: number;
    object_title: string;
    object_description: string;
    desired_date: string;
    size_category: string;
    slot_id: number;
  }) => api.post<ContainerRequest>('/containers/requests', data),
  validateRequest: (id: number) => api.put(`/containers/requests/${id}/validate`),
  rejectRequest: (id: number, reason: string) => api.put(`/containers/requests/${id}/reject`, { reason }),
  getMyRequests: () => api.get<ContainerRequest[]>('/containers/requests/mine'),
  confirmDeposit: (id: number) => api.put(`/containers/requests/${id}/confirm-deposit`),
  getAvailableObjects: () => api.get<AvailableObject[]>('/containers/available-objects'),
  getBarcodeUrl: async (id: number) => {
    const res = await api.get(`/containers/requests/${id}/barcode`, { responseType: 'blob' });
    return window.URL.createObjectURL(res.data as Blob);
  },
};

export const scoreService = {
  getMyScore: () => api.get('/score/me'),
  getLeaderboard: () => api.get<{ user_id: number; firstname: string; lastname: string; total_points: number; level: string; co2_saved_kg: number }[]>('/score/leaderboard'),
};

export const publicStatsService = {
  get: () => api.get<{ total_users: number; active_listings: number; co2_saved_kg: number; waste_avoided_kg: number }>('/stats/public'),
};

export const notificationService = {
  getAll: () => api.get<Notification[]>('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
};

export const adminService = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
  getFinance: () => api.get('/admin/finance'),
  getInvoices: (params?: { status?: string }) => api.get<Invoice[]>('/admin/invoices', { params }),
  getArticles: () => api.get<Article[]>('/admin/articles'),
  createArticle: (data: Partial<Article>) => api.post<Article>('/admin/articles', data),
  updateArticle: (id: number, data: Partial<Article>) => api.put<Article>(`/admin/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete(`/admin/articles/${id}`),
  getProjects: () => api.get<Project[]>('/admin/projects'),
  createProject: (data: Partial<Project>) => api.post<Project>('/admin/projects', data),
  updateProject: (id: number, data: Partial<Project>) => api.put<Project>(`/admin/projects/${id}`, data),
  deleteProject: (id: number) => api.delete(`/admin/projects/${id}`),
  getUserSubscriptions: () => api.get<Subscription[]>('/admin/user-subscriptions'),
  cancelSubscription: (id: number) => api.delete(`/admin/user-subscriptions/${id}`),
  deleteListing: (id: number) => api.delete(`/admin/listings/${id}`),
  moderateListing: (id: number, data: { is_moderated: boolean; moderation_note: string }) => api.put<Listing>(`/admin/listings/${id}/moderate`, data),
};

export const dashboardService = {
  getParticulier: () => api.get('/particulier/dashboard'),
  getPro: () => api.get('/pro/dashboard'),
  getSalarie: () => api.get('/salarie/dashboard'),
};

export const salarieService = {
  getMyWorkshops: (params?: { status?: string }) => api.get('/salarie/workshops', { params }),
  getMyArticles: () => api.get('/salarie/articles'),
  createArticle: (data: { title: string; content: string; tags?: string; status?: string }) =>
    api.post('/salarie/articles', data),
  updateArticle: (id: number, data: Partial<{ title: string; content: string; tags: string; status: string }>) =>
    api.put(`/salarie/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete(`/salarie/articles/${id}`),
};

export const subscriptionService = {
  getPlans: () => api.get<SubscriptionPlan[]>('/subscription-plans'),
  getMy: () => api.get<{ subscriptions: Subscription[]; listing_limit: number; base_limit: number }>('/subscriptions/my'),
  subscribeFree: (slug: string) => api.post<Subscription>('/subscriptions/subscribe-free', { slug }),
};

export const adminPlanService = {
  getAll: () => api.get<SubscriptionPlan[]>('/admin/subscription-plans'),
  create: (data: Partial<SubscriptionPlan>) => api.post<SubscriptionPlan>('/admin/subscription-plans', data),
  update: (id: number, data: Partial<SubscriptionPlan>) => api.put<SubscriptionPlan>(`/admin/subscription-plans/${id}`, data),
  delete: (id: number) => api.delete(`/admin/subscription-plans/${id}`),
};

export interface ProjectStepInput {
  description?: string;
  before_images?: string;
  after_images?: string;
  tags?: string;
  image_url?: string;
  comment?: string;
}

export const projectService = {
  getAll: (params?: { search?: string }) => api.get<Project[]>('/projects', { params }),
  getOne: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  getMine: () => api.get<Project[]>('/pro/projects'),
  create: (data: Partial<Project>) => api.post<Project>('/pro/projects', data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/pro/projects/${id}`, data),
  delete: (id: number) => api.delete(`/pro/projects/${id}`),
  follow: (id: number) => api.post(`/projects/${id}/follow`),
  unfollow: (id: number) => api.delete(`/projects/${id}/follow`),
  addUpdate: (id: number, data: ProjectStepInput) =>
    api.post<ProjectUpdate>(`/pro/projects/${id}/updates`, data),
  updateUpdate: (id: number, updateId: number, data: ProjectStepInput) =>
    api.put<ProjectUpdate>(`/pro/projects/${id}/updates/${updateId}`, data),
  deleteUpdate: (id: number, updateId: number) =>
    api.delete(`/pro/projects/${id}/updates/${updateId}`),
};

export const messageService = {
  getConversations: () => api.get<Conversation[]>('/conversations'),
  getOrCreate: (data: { other_user_id: number; listing_id?: number }) =>
    api.post<Conversation>('/conversations', data),
  getMessages: (conversationId: number) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),
  send: (conversationId: number, content: string) =>
    api.post<Message>(`/conversations/${conversationId}/messages`, { content }),
};

export const reviewService = {
  getForListing: (listingId: number) => api.get<Review[]>(`/listings/${listingId}/reviews`),
  getForUser: (userId: number) => api.get(`/users/${userId}/reviews`),
  create: (listingId: number, data: { rating: number; comment: string }) =>
    api.post<Review>(`/listings/${listingId}/reviews`, data),
  delete: (id: number) => api.delete(`/reviews/${id}`),
};

export const reportService = {
  create: (listingId: number, data: { reason: string; details?: string }) =>
    api.post(`/listings/${listingId}/report`, data),
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ reports: any[]; total: number; page: number; limit: number }>('/admin/reports', { params }),
  resolve: (id: number, data: { status: string; admin_note?: string }) =>
    api.put(`/admin/reports/${id}/resolve`, data),
};

export const articleService = {
  getAll: (params?: { page?: number; limit?: number; tag?: string }) =>
    api.get<{ articles: Article[]; total: number; page: number; limit: number }>('/articles', { params }),
  getOne: (id: number) => api.get<Article>(`/articles/${id}`),
};

export const forumService = {
  getTopics: (params?: { page?: number; limit?: number }) =>
    api.get<{ topics: ForumTopic[]; total: number; page: number; limit: number }>('/forum/topics', { params }),
  getTopic: (id: number) =>
    api.get<{ topic: ForumTopic; posts: ForumPost[] }>(`/forum/topics/${id}`),
  createTopic: (data: { title: string; content: string }) =>
    api.post<ForumTopic>('/forum/topics', data),
  updateTopic: (id: number, data: { title?: string; content?: string }) =>
    api.put<ForumTopic>(`/forum/topics/${id}`, data),
  deleteTopic: (id: number) => api.delete(`/forum/topics/${id}`),
  pinTopic: (id: number) => api.put(`/forum/topics/${id}/pin`),
  lockTopic: (id: number) => api.put(`/forum/topics/${id}/lock`),
  createPost: (topicId: number, content: string) =>
    api.post<ForumPost>(`/forum/topics/${topicId}/posts`, { content }),
  deletePost: (id: number) => api.delete(`/forum/posts/${id}`),
};

export const bookingService = {
  getMyBookings: () => api.get<WorkshopBooking[]>('/user/bookings'),
};

export const stripeService = {
  createWorkshopCheckout: (workshopId: number) =>
    api.post<{ checkout_url: string }>('/stripe/workshop-checkout', { workshop_id: workshopId }),
  createListingCheckout: (listingId: number) =>
    api.post<{ checkout_url: string }>('/stripe/listing-checkout', { listing_id: listingId }),
  createSubscriptionCheckout: (plan: string) =>
    api.post<{ checkout_url: string }>('/stripe/subscription-checkout', { plan }),
};

export const invoiceService = {
  getMine: () => api.get<Invoice[]>('/invoices/mine'),
  downloadPdf: async (id: number, number?: string) => {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-${number || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

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
