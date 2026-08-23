import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import type { Driver, Business } from '../lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  driverProfile: Driver | null;
  business: Business | null;
  loading: boolean;
  onboardingCompleted: boolean;
  signUp: (email: string, password: string, driverName: string, phone: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  saveDriverProfile: (data: { driver_name: string; phone_number: string; whatsapp_number: string }) => Promise<{ driver: Driver | null; error: Error | null }>;
  saveBusinessDetails: (data: { business_name: string; city: string; booking_contact_name: string; booking_contact_phone: string }) => Promise<{ business: Business | null; error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage key fallbacks for demo / mock mode when Supabase credentials are not connected yet
const DEMO_USER_KEY = 'cab_link_demo_user';
const DEMO_DRIVER_KEY = 'cab_link_demo_driver';
const DEMO_BUSINESS_KEY = 'cab_link_demo_business';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch driver profile and business from Supabase or Mock
  const fetchDriverData = async (authUser: User) => {
    if (!isConfigured) {
      // Mock mode
      const savedDriver = localStorage.getItem(DEMO_DRIVER_KEY);
      const savedBusiness = localStorage.getItem(DEMO_BUSINESS_KEY);
      
      let parsedDriver: Driver | null = savedDriver ? JSON.parse(savedDriver) : null;
      let parsedBusiness: Business | null = savedBusiness ? JSON.parse(savedBusiness) : null;

      if (!parsedDriver) {
        // Create initial uncompleted driver record for mock
        parsedDriver = {
          id: 'demo-driver-id',
          auth_user_id: authUser.id,
          business_id: null,
          driver_name: authUser.user_metadata?.full_name || '',
          phone_number: authUser.user_metadata?.mobile || '',
          whatsapp_number: authUser.user_metadata?.mobile || '',
          onboarding_completed: false,
        };
        localStorage.setItem(DEMO_DRIVER_KEY, JSON.stringify(parsedDriver));
      }

      setDriverProfile(parsedDriver);
      setBusiness(parsedBusiness);
      return;
    }

    try {
      // Fetch driver record
      const { data: driverData, error: driverErr } = await supabase
        .from('drivers')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (driverErr && driverErr.code !== 'PGRST116') {
        console.error('Error fetching driver profile:', driverErr);
      }

      if (driverData) {
        setDriverProfile(driverData as Driver);

        if (driverData.business_id) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', driverData.business_id)
            .maybeSingle();

          if (bizData) {
            setBusiness(bizData as Business);
          }
        }
      } else {
        setDriverProfile(null);
        setBusiness(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching driver data:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);

      if (!isConfigured) {
        const demoUserJson = localStorage.getItem(DEMO_USER_KEY);
        if (demoUserJson) {
          const mockUser = JSON.parse(demoUserJson) as User;
          setUser(mockUser);
          await fetchDriverData(mockUser);
        }
        setLoading(false);
        return;
      }

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await fetchDriverData(initialSession.user);
      }

      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchDriverData(newSession.user);
        } else {
          setDriverProfile(null);
          setBusiness(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initAuth();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchDriverData(user);
    }
  };

  const signUp = async (email: string, password: string, driverName: string, phone: string) => {
    if (!isConfigured) {
      const mockUser: Partial<User> = {
        id: `user-${Date.now()}`,
        email,
        user_metadata: { full_name: driverName, mobile: phone }
      };
      const mockDriver: Driver = {
        id: `driver-${Date.now()}`,
        auth_user_id: mockUser.id!,
        business_id: null,
        driver_name: driverName,
        phone_number: phone,
        whatsapp_number: phone,
        onboarding_completed: false
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(DEMO_DRIVER_KEY, JSON.stringify(mockDriver));
      localStorage.removeItem(DEMO_BUSINESS_KEY);
      
      setUser(mockUser as User);
      setDriverProfile(mockDriver);
      setBusiness(null);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: driverName,
          mobile: phone
        }
      }
    });

    if (error) return { error };

    if (data.user) {
      setUser(data.user);
      const { error: driverErr } = await supabase
        .from('drivers')
        .upsert({
          auth_user_id: data.user.id,
          driver_name: driverName,
          phone_number: phone,
          whatsapp_number: phone,
          onboarding_completed: false
        }, { onConflict: 'auth_user_id' });

      if (driverErr) {
        console.error('Error creating driver record on signup:', driverErr);
      }

      await fetchDriverData(data.user);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      const demoUserJson = localStorage.getItem(DEMO_USER_KEY);
      if (demoUserJson) {
        const mockUser = JSON.parse(demoUserJson) as User;
        setUser(mockUser);
        await fetchDriverData(mockUser);
        return { error: null };
      }
      return { error: new Error('User not found in demo mode. Please Sign Up.') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { error };

    if (data.user) {
      setUser(data.user);
      await fetchDriverData(data.user);
    }

    return { error: null };
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { 
        error: new Error('Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing in Vercel settings.') 
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Sending password reset email to:', email, 'Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('Supabase resetPasswordForEmail error:', error);
        return { error };
      }

      console.log('Supabase resetPasswordForEmail success:', data);
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error calling resetPasswordForEmail:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    if (!isConfigured) {
      return { 
        error: new Error('Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing in Vercel settings.') 
      };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'recovery'
      });

      if (error) {
        console.error('Supabase verifyOtp error:', error);
        return { error };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      console.log('Supabase verifyOtp success:', data);
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error calling verifyOtp:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!isConfigured) {
      return { 
        error: new Error('Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing in Vercel settings.') 
      };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Supabase updateUser password error:', error);
        return { error };
      }

      console.log('Supabase updateUser password success:', data);
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error calling updateUser:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    if (!isConfigured) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      setDriverProfile(null);
      setBusiness(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDriverProfile(null);
    setBusiness(null);
  };

  const saveDriverProfile = async (data: { driver_name: string; phone_number: string; whatsapp_number: string }) => {
    if (!user) return { driver: null, error: new Error('Not authenticated') };

    if (!isConfigured) {
      const currentDriver: Driver = driverProfile || {
        id: `driver-${Date.now()}`,
        auth_user_id: user.id,
        business_id: business?.id || null,
        driver_name: data.driver_name,
        phone_number: data.phone_number,
        whatsapp_number: data.whatsapp_number,
        onboarding_completed: false
      };

      const updatedDriver: Driver = {
        ...currentDriver,
        driver_name: data.driver_name,
        phone_number: data.phone_number,
        whatsapp_number: data.whatsapp_number
      };

      localStorage.setItem(DEMO_DRIVER_KEY, JSON.stringify(updatedDriver));
      setDriverProfile(updatedDriver);
      return { driver: updatedDriver, error: null };
    }

    try {
      const { data: updated, error } = await supabase
        .from('drivers')
        .upsert({
          auth_user_id: user.id,
          driver_name: data.driver_name,
          phone_number: data.phone_number,
          whatsapp_number: data.whatsapp_number,
          business_id: business?.id || null
        }, { onConflict: 'auth_user_id' })
        .select()
        .single();

      if (error) return { driver: null, error };
      setDriverProfile(updated as Driver);
      return { driver: updated as Driver, error: null };
    } catch (err: any) {
      return { driver: null, error: err };
    }
  };

  const saveBusinessDetails = async (data: { business_name: string; city: string; booking_contact_name: string; booking_contact_phone: string }) => {
    if (!user) return { business: null, error: new Error('Not authenticated') };

    if (!isConfigured) {
      const newBiz: Business = {
        id: business?.id || `biz-${Date.now()}`,
        business_name: data.business_name,
        city: data.city,
        booking_contact_name: data.booking_contact_name || null,
        booking_contact_phone: data.booking_contact_phone || null
      };

      localStorage.setItem(DEMO_BUSINESS_KEY, JSON.stringify(newBiz));
      setBusiness(newBiz);

      if (driverProfile) {
        const updatedDriver: Driver = {
          ...driverProfile,
          business_id: newBiz.id,
          onboarding_completed: true
        };
        localStorage.setItem(DEMO_DRIVER_KEY, JSON.stringify(updatedDriver));
        setDriverProfile(updatedDriver);
      }

      return { business: newBiz, error: null };
    }

    try {
      let bizId = business?.id;
      let bizResult: Business | null = null;

      if (bizId) {
        const { data: updatedBiz, error: bizErr } = await supabase
          .from('businesses')
          .update({
            business_name: data.business_name,
            city: data.city,
            booking_contact_name: data.booking_contact_name || null,
            booking_contact_phone: data.booking_contact_phone || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', bizId)
          .select()
          .single();

        if (bizErr) return { business: null, error: bizErr };
        bizResult = updatedBiz as Business;
      } else {
        const { data: createdBiz, error: createErr } = await supabase
          .from('businesses')
          .insert({
            business_name: data.business_name,
            city: data.city,
            booking_contact_name: data.booking_contact_name || null,
            booking_contact_phone: data.booking_contact_phone || null
          })
          .select()
          .single();

        if (createErr) return { business: null, error: createErr };
        bizResult = createdBiz as Business;
        bizId = createdBiz.id;
      }

      setBusiness(bizResult);

      const { data: updatedDriver, error: driverErr } = await supabase
        .from('drivers')
        .update({
          business_id: bizId,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (!driverErr && updatedDriver) {
        setDriverProfile(updatedDriver as Driver);
      }

      return { business: bizResult, error: null };
    } catch (err: any) {
      return { business: null, error: err };
    }
  };

  const onboardingCompleted = Boolean(driverProfile?.onboarding_completed);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        driverProfile,
        business,
        loading,
        onboardingCompleted,
        signUp,
        signIn,
        signOut,
        resetPassword,
        verifyEmailOtp,
        updatePassword,
        saveDriverProfile,
        saveBusinessDetails,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
