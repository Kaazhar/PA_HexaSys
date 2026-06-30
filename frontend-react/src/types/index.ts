export type UserRole = 'particulier' | 'professionnel' | 'salarie' | 'admin';

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  phone?: string;
  address?: string;
  is_active: boolean;
  is_verified: boolean;
  first_login: boolean;
  is_banned?: boolean;
  ban_reason?: string;
  siret?: string;
  siret_verified?: boolean;
  phone_verified?: boolean;
  two_fa_enabled?: boolean;
  email_two_fa_enabled?: boolean;
  newsletter_subscribed?: boolean;
  avatar_url?: string;
  banner_url?: string;
  banner_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

export interface Listing {
  id: number;
  title: string;
  description: string;
  type: 'don' | 'vente';
  category_id: number;
  category?: Category;
  condition: 'neuf' | 'bon_etat' | 'use' | 'pieces';
  price?: number;
  location: string;
  images?: string;
  status: 'pending' | 'active' | 'rejected' | 'sold';
  user_id: number;
  user?: User;
  reject_reason?: string;
  weight?: number;
  size_category?: string;
  is_sponsored?: boolean;
  sponsored_until?: string;
  commission_rate?: number;
  commission_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Workshop {
  id: number;
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  price: number;
  max_spots: number;
  min_spots?: number;
  enrolled: number;
  image?: string;
  category_id: number;
  category?: Category;
  status: 'draft' | 'pending' | 'active' | 'cancelled';
  instructor_id: number;
  instructor?: User;
  type: 'atelier' | 'formation' | 'conference';
  objective?: string;
  sessions?: WorkshopSession[];
  chapters?: WorkshopChapter[];
  created_at: string;
}

export interface WorkshopSession {
  id: number;
  date: string;
  duration: number;
  order: number;
}

export interface WorkshopChapter {
  id: number;
  title: string;
  content: string;
  order: number;
}

export interface WorkshopBooking {
  id: number;
  workshop_id: number;
  workshop?: Workshop;
  user_id: number;
  user?: User;
  status: string;
  created_at: string;
}

export interface Container {
  id: number;
  name: string;
  address: string;
  district: string;
  capacity: number;
  current_count: number;
  status: 'operational' | 'full' | 'maintenance';
  created_at: string;
  latitude: number;
  longitude: number;
}

export interface ContainerSlot {
  id: number;
  container_id: number;
  slot_code: string;
  size: 'S' | 'M' | 'L';
  status: 'free' | 'reserved' | 'occupied';
  request_id?: number;
}

export interface ContainerRequest {
  id: number;
  user_id: number;
  user?: User;
  container_id: number;
  container?: Container;
  object_title: string;
  object_description: string;
  desired_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'deposited';
  access_code?: string;
  barcode?: string;
  reject_reason?: string;
  size_category?: string;
  slot_id?: number;
  slot_code?: string;
  created_at: string;
}

export interface AvailableObject {
  slot_id: number;
  slot_code: string;
  size: 'S' | 'M' | 'L';
  container_id: number;
  container_name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  request_id: number;
  object_title: string;
  object_description: string;
}

export interface UpcyclingScore {
  id: number;
  user_id: number;
  total_points: number;
  level: string;
  waste_avoided_kg: number;
  co2_saved_kg: number;
  water_saved_liters: number;
}

export interface ScoreEntry {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  action: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  read: boolean;
  created_at: string;
}

export interface Invoice {
  id: number;
  number: string;
  user_id: number;
  user?: User;
  type: string;
  description?: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  pdf_url?: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_listings: number;
  pending_listings: number;
  total_workshops: number;
  pending_workshops: number;
  total_containers: number;
  pending_container_requests: number;
  monthly_revenue: Array<{ month: string; revenue: number }>;
  monthly_revenue_total: number;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author?: User;
  status: 'draft' | 'published';
  views: number;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  before_images: string;
  after_images: string;
  tags?: string;
  user_id: number;
  user?: User;
  views: number;
  likes: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdate {
  id: number;
  project_id: number;
  image_url: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail {
  project: Project;
  updates: ProjectUpdate[];
  followers_count: number;
  is_following: boolean;
  forum_topic_id: number;
}

export interface ForumTopic {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author?: User;
  is_pinned: boolean;
  is_locked: boolean;
  views: number;
  replies_count: number;
  project_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: number;
  topic_id: number;
  author_id: number;
  author?: User;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: number;
  max_listings_bonus: number;
  features: string;
  is_active: boolean;
  sort_order: number;
  duration_days: number;
  created_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan: string;
  price: number;
  status: string;
  renewal_date: string;
  expires_at?: string;
  max_listings_bonus: number;
  notified_expiry: boolean;
  stripe_id?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
