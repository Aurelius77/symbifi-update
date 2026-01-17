import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Globe, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const industries = [
  'Technology',
  'Media & Entertainment',
  'Marketing & Advertising',
  'Design & Creative',
  'Consulting',
  'Construction',
  'Healthcare',
  'Education',
  'Finance',
  'Legal',
  'Manufacturing',
  'Retail',
  'Other'
];

const countries = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'IN', name: 'India', currency: 'INR' },
];

interface ProfileData {
  business_name: string;
  industry: string;
  country: string;
  currency: string;
  logo_url: string | null;
}

export function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    business_name: '',
    industry: '',
    country: 'NG',
    currency: 'NGN',
    logo_url: null
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('business_name, industry, country, currency, logo_url')
      .eq('user_id', user!.id)
      .single();
    
    if (!error && data) {
      setProfile({
        business_name: data.business_name || '',
        industry: data.industry || '',
        country: data.country || 'NG',
        currency: data.currency || 'NGN',
        logo_url: data.logo_url
      });
    }
    setLoading(false);
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    setProfile(prev => ({
      ...prev,
      country: countryCode,
      currency: country?.currency || prev.currency
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/logo.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Update profile with logo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: profile.business_name || null,
        industry: profile.industry || null,
        country: profile.country || null,
        currency: profile.currency || null
      })
      .eq('user_id', user!.id);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated successfully');
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          Business Profile
        </CardTitle>
        <CardDescription>
          Update your agency or business information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Business Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
              {profile.logo_url ? (
                <img 
                  src={profile.logo_url} 
                  alt="Business logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
                disabled={uploading}
              />
              <label htmlFor="logo-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 5MB. Recommended: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="business_name">Agency / Business Name</Label>
          <Input
            id="business_name"
            value={profile.business_name}
            onChange={(e) => setProfile(prev => ({ ...prev, business_name: e.target.value }))}
            placeholder="Your company name"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={profile.industry}
            onValueChange={(value) => setProfile(prev => ({ ...prev, industry: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country and Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={profile.country}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {country.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={profile.currency}
              onChange={(e) => setProfile(prev => ({ ...prev, currency: e.target.value }))}
              placeholder="NGN"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
