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
  is_banned: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
  siret?: string;
  siret_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface BanRecord {
  id: number;
  user_id: number;
  admin_id: number;
  admin?: User;
  reason: string;
  expires_at?: string;
  is_permanent: boolean;
  is_active: boolean;
  created_at: string;
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
  min_spots: number;
  enrolled: number;
  image?: string;
  category_id: number;
  category?: Category;
  status: 'draft' | 'pending' | 'active' | 'cancelled';
  cancel_reason?: string;
  instructor_id: number;
  instructor?: User;
  type: 'atelier' | 'formation' | 'conference';
  created_at: string;
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
  latitude: number;
  longitude: number;
  created_at: string;
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
  status: 'pending' | 'approved' | 'rejected';
  access_code?: string;
  barcode?: string;
  reject_reason?: string;
  created_at: string;
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

export interface Subscription {
  id: number;
  user_id: number;
  plan: 'decouverte' | 'pro' | 'enterprise';
  price: number;
  status: string;
  renewal_date: string;
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
}

export interface Conversation {
  id: number;
  participant_one_id: number;
  participant_one?: User;
  participant_two_id: number;
  participant_two?: User;
  listing_id?: number;
  listing?: Listing;
  last_message_at: string;
  last_message?: string;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: User;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  reviewer_id: number;
  reviewer?: User;
  target_user_id: number;
  listing_id: number;
  listing?: Listing;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SearchResults {
  listings: Listing[];
  workshops: Workshop[];
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
