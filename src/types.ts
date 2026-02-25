export interface UserProfile {
  id?: any;
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
  orientation: string[]; // multi-select array of orientations
  is_paid: boolean;
  looking_for_gender: string[]; // array of genders the user is looking for
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
  email?: string;
  password?: string;
  nickname?: string;
  conosciamoci_meglio?: Record<string, string>;
  body_type?: string;
  height_cm?: number;
}

export interface ChatRequest {
  id: any;
  from_user_id: any;
  to_user_id: any;
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
  id: any;
  user_id: any;
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

export interface SoulLink {
  id: any;
  sender_id: any;
  receiver_id: any;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  // Joined fields
  other_user?: {
    id: any;
    name: string;
    surname?: string;
    photos?: string[];
    photo_url?: string;
    city?: string;
    is_online?: boolean;
  };
}
