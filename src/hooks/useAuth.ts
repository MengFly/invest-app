import { useState, useEffect, useCallback } from 'react';
import { getClient } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getClient();

    // 初始化时恢复已有 Session
    client.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    // 监听登录状态变化
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (_event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const client = getClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error?: string; needsEmailConfirm?: boolean }> => {
    const client = getClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { needsEmailConfirm: !data?.session };
  }, []);

  const signOut = useCallback(async () => {
    const client = getClient();
    await client.auth.signOut();
  }, []);

  return { user, session, loading, signIn, signUp, signOut };
}
