import { createClient } from './client';

export async function checkIsSuperadmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  // Check user role from database user_roles table
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return false;

  return data.role === 'superadmin' || user.email === process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || user.email === 'fctutor1984@gmail.com';
}