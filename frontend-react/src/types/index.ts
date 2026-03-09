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
  enrolled: number;
  image?: string;
  category_id: number;
  category?: Category;
  status: 'draft' | 'pending' | 'active' | 'cancelled';
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
