import { supabase } from './supabase';
import { AuthError, User,Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';



export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Subscribe to changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user,
  };
};

// Add this type for standardized error handling
type AuthResponse = {
  user?: User | null;
  session?: any;
  error?: AuthError | null;
};

// 📱 Sign in using phone OTP
export const signInWithPhone = async (phone: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithOtp({ phone });
  return { user: data?.user, error };
};

// ✅ Verify the OTP for phone login
export const verifyOTP = async (phone: string, token: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  return { user: data?.user, error };
};

// 📧 Sign up using email and password
export const signUpWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data?.user, error };
};

// 📧 Sign in using email and password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, session: data?.session, error };
};

// 🚪 Sign out user
export const signOut = async (): Promise<{ error?: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return { error };
};