import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kcqeiogrndnifhimrawd.supabase.co';
const supabaseAnonKey = 'sb_publishable_3Ou-bGsfDOk9FWHjXyiwwQ_ywZQUEES';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
