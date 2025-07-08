import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Debugging setup
const enableDebug = false; // Set to false in production

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key);
    if (enableDebug) console.log(`[Supabase Storage] GET ${key}:`, value);
    return value;
  },
  setItem: async (key: string, value: string) => {
    if (enableDebug) console.log(`[Supabase Storage] SET ${key}:`, value);
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (enableDebug) console.log(`[Supabase Storage] REMOVE ${key}`);
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mtkumkcrrapsumlsqher.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10a3Vta2NycmFwc3VtbHNxaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDE0MTksImV4cCI6MjA2Njc3NzQxOX0.6FjpDBFqUZK4SR9vWq1mWxoZvf8vv8bllbTcigGLcoc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Add debug interceptors
if (enableDebug) {
  // Monitor auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Supabase Auth] ${event} event`, session);
  });

  // New way to track connection status
  const channel = supabase.channel('connection-monitor')
    .on('system' as any, { event: '*' }, (payload: any) => {
      console.log('[Supabase Realtime] System event:', payload);
    })
    .subscribe();
}



// Test function - call this somewhere in your app to verify connection
export const testSupabaseConnection = async () => {
  console.log('[Supabase] Testing connection...');
  try {
    const { data, error } = await supabase
      .from('dummy_table') // Use any existing table
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('[Supabase] Connection test failed:', error);
      return false;
    }
    console.log('[Supabase] Connection successful:', data);
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test error:', error);
    return false;
  }
};