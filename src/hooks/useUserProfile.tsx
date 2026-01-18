import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  business_name: string | null;
  industry: string | null;
  country: string | null;
  currency: string;
  logo_url: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  business_name: null,
  industry: null,
  country: 'NG',
  currency: 'NGN',
  logo_url: null,
};

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('business_name, industry, country, currency, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setProfile({
        business_name: data.business_name,
        industry: data.industry,
        country: data.country || 'NG',
        currency: data.currency || 'NGN',
        logo_url: data.logo_url,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatCurrency = useCallback((amount: number): string => {
    const currencyCode = profile.currency || 'NGN';
    
    // Map currency codes to locales for proper formatting
    const localeMap: Record<string, string> = {
      'NGN': 'en-NG',
      'USD': 'en-US',
      'GBP': 'en-GB',
      'EUR': 'en-EU',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'GHS': 'en-GH',
      'KES': 'en-KE',
      'ZAR': 'en-ZA',
      'AED': 'ar-AE',
      'INR': 'en-IN',
    };

    const locale = localeMap[currencyCode] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount);
  }, [profile.currency]);

  const getCurrencySymbol = useCallback((): string => {
    const symbolMap: Record<string, string> = {
      'NGN': '₦',
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'CAD': 'CA$',
      'AUD': 'A$',
      'GHS': 'GH₵',
      'KES': 'KSh',
      'ZAR': 'R',
      'AED': 'د.إ',
      'INR': '₹',
    };
    return symbolMap[profile.currency] || profile.currency;
  }, [profile.currency]);

  return {
    profile,
    loading,
    formatCurrency,
    getCurrencySymbol,
    refetch: fetchProfile,
  };
}
