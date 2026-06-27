// ============================================================
// 知遇 共享类型定义
// ============================================================

export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'banned';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  application_reason: string;
  reject_reason: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface UserProfile {
  user_id: number;
  real_name: string | null;
  gender: 'male' | 'female' | 'other' | null;
  birth_year: number | null;
  province: string | null;
  city: string | null;
  school_name: string | null;
  exam_total_score: number | null;
  subject_scores: Record<string, number> | null;
  interests: string[] | null;
  hobbies: string[] | null;
  hands_on_ability: number;
  spatial_thinking: number;
  interpersonal_skill: number;
  art_perception: number;
  logical_thinking: number;
  language_expression: number;
  memory_ability: number;
  observation_ability: number;
  family_income_level: 'low' | 'medium' | 'high';
  preferred_region: string | null;
  preferred_school_type: string[] | null;
  updated_at: string;
}

export interface Assessment {
  id: number;
  user_id: number;
  answers: Record<string, number>;
  talent_profile: TalentProfile | null;
  created_at: string;
}

export interface TalentProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommended_directions: string[];
  detailed_analysis: string;
}

export interface FraudCheck {
  id: number;
  user_id: number;
  query: string;
  risk_level: 'safe' | 'warning' | 'danger';
  result: FraudCheckResult;
  created_at: string;
}

export interface FraudCheckResult {
  risk_level: 'safe' | 'warning' | 'danger';
  analysis: string;
  red_flags: string[];
  suggestions: string[];
}

export interface UsageStats {
  total_users: number;
  pending_users: number;
  approved_users: number;
  total_tokens: number;
  feature_breakdown: Record<string, { count: number; tokens: number }>;
  recent_users: { id: number; username: string; status: string; created_at: string }[];
  user_usage: { user_id: number; username: string; total_tokens: number; request_count: number; last_active: string }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// API 请求体类型
export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  application_reason: string;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface ChangePasswordBody {
  old_password: string;
  new_password: string;
}

export interface ProfileUpdateBody {
  real_name?: string;
  gender?: 'male' | 'female' | 'other';
  birth_year?: number;
  province?: string;
  city?: string;
  school_name?: string;
  exam_total_score?: number;
  subject_scores?: Record<string, number>;
  interests?: string[];
  hobbies?: string[];
  hands_on_ability?: number;
  spatial_thinking?: number;
  interpersonal_skill?: number;
  art_perception?: number;
  logical_thinking?: number;
  language_expression?: number;
  memory_ability?: number;
  observation_ability?: number;
  family_income_level?: 'low' | 'medium' | 'high';
  preferred_region?: string;
  preferred_school_type?: string[];
}
