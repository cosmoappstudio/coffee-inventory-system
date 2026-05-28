import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Placeholder only so createClient does not throw before .env is set. */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.cRPLTxiaFKtDZsGfgE0bBGT0e6jfXkWwaVhKTZZBlYA';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY
);

if (!isSupabaseConfigured()) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local — login will not work until then.'
  );
}

/** Internal auth email: imm-1034@immersion.internal */
export function employeeAuthEmail(employeeId: string): string {
  return `${employeeId.trim().toLowerCase()}@immersion.internal`;
}

export type EmployeeRow = {
  id: string;
  auth_id: string;
  name: string;
  role: 'Owner' | 'Location Manager' | 'Barista';
  location_id: string | null;
  status: 'Active' | 'On Leave' | 'Inactive';
  email: string;
};
