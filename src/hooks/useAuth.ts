import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    // Set up listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let isAdmin = false;
        if (user) {
          // Check admin role using security definer function
          const { data } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin',
          });
          isAdmin = !!data;
        }
        setState({ user, session, loading: false, isAdmin });
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      let isAdmin = false;
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        isAdmin = !!data;
      }
      setState({ user, session, loading: false, isAdmin });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, whatsapp: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, whatsapp },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signUp, signIn, signOut };
}
