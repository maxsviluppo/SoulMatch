export interface UserProfile {
  id?: number;
  name: string;
  surname: string;
  dob: string;
  city: string;
  province?: string;
  job: string;
  description: string;
  hobbies: string;
  desires: string;
  gender: string;
  orientation: string;
  is_paid: boolean;
  looking_for_gender: string;
  looking_for_job: string;
  looking_for_hobbies: string;
  looking_for_city: string;
  looking_for_age_min: number;
  looking_for_age_max: number;
  looking_for_height: string;
  looking_for_body_type: string;
  looking_for_other: string;
  photo_url?: string;
  id_document_url?: string;
  photos?: string[]; // Up to 5 photos
  likes_count?: number;
  hearts_count?: number;
  is_online?: boolean;
  conosciamoci_meglio?: Record<string, string>;
}

export interface ChatRequest {
  id: number;
  from_user_id: number;
  to_user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  name?: string;
  surname?: string;
  photo_url?: string;
}

export type Gender = 'Uomo' | 'Donna' | 'Non-binario' | 'Transgender' | 'Genderfluid' | 'Queer' | 'Altro';
export type Orientation = 'Eterosessuale' | 'Gay' | 'Lesbica' | 'Bisessuale' | 'Pansessuale' | 'Queer' | 'Altro';

export interface Post {
  id: number;
  user_id: number;
  author_name?: string;
  author_photo?: string;
  photos: string[]; // Up to 3 photos
  description: string;
  likes_count: number;
  hearts_count: number;
  created_at: string;
  has_liked?: boolean;
  has_hearted?: boolean;
}
