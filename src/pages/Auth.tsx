import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Mail, Lock, User, AlertCircle, Chrome, KeyRound } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const businessSchema = z.string().min(2, 'Business name must be at least 2 characters');

export function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
  });

  const [resetForm, setResetForm] = useState({
    email: '',
    token: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
  });

  const validateField = (field: string, value: string) => {
    try {
      if (field === 'email') {
        emailSchema.parse(value);
      } else if (field === 'password') {
        passwordSchema.parse(value);
      } else if (field === 'fullName' && isSignUp) {
        nameSchema.parse(value);
      } else if (field === 'businessName' && isSignUp && value.trim()) {
        businessSchema.parse(value);
      }
      return '';
    } catch (e) {
      if (e instanceof z.ZodError) {
        return e.errors[0].message;
      }
      return 'Invalid input';
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setFieldErrors({ ...fieldErrors, [field]: validateField(field, value) });
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    
    // Validate all fields
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);
    const nameError = isSignUp ? validateField('fullName', formData.fullName) : '';
    const businessError = isSignUp ? validateField('businessName', formData.businessName) : '';
    
    if (emailError || passwordError || nameError || businessError) {
      setFieldErrors({
        email: emailError,
        password: passwordError,
        fullName: nameError,
        businessName: businessError,
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.businessName.trim() || undefined
        );
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else {
          setNotice('Verification email sent. Please check your inbox and click the link to activate your account.');
          setFormData({
            email: formData.email,
            password: '',
            fullName: '',
            businessName: '',
          });
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setOauthLoading(true);

    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  };

  const handleResetRequest = async () => {
    setResetError(null);
    setResetNotice(null);

    const emailError = validateField('email', resetForm.email);
    if (emailError) {
      setResetError(emailError);
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetForm.email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetNotice('We sent a reset code to your email. Enter it below to continue.');
      setResetStep('verify');
    }

    setResetLoading(false);
  };

  const handleResetVerify = async () => {
    setResetError(null);
    setResetNotice(null);

    if (!resetForm.token.trim()) {
      setResetError('Enter the reset code from your email.');
      return;
    }

    if (resetForm.newPassword.trim().length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: resetForm.email,
      token: resetForm.token,
      type: 'recovery',
    });

    if (verifyError) {
      setResetError(verifyError.message);
      setResetLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: resetForm.newPassword,
    });

    if (updateError) {
      setResetError(updateError.message);
      setResetLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setResetLoading(false);
    setResetOpen(false);
    setResetForm({
      email: '',
      token: '',
      newPassword: '',
      confirmPassword: '',
    });
    setNotice('Password updated. Please sign in with your new password.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <Link to="/landing" className="flex items-center justify-center gap-3 mb-8 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
            <img src="/pavel-icon.png" alt="Pavel" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pavel</h1>
            <p className="text-xs text-muted-foreground">Payroll Manager</p>
          </div>
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Sign up to start managing your contractor payments' 
                : 'Sign in to your Pavel account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 bg-white text-[#3c4043] border-[#dadce0] hover:bg-[#f8f9fa] hover:text-[#3c4043] shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={loading || oauthLoading}
            >
              <img src="/icons8-google.svg" alt="" className="w-4 h-4" />
              Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {notice && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {isSignUp && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business / Agency Name (optional)</Label>
                    <Input
                      id="businessName"
                      placeholder="Pavel Agency"
                      value={formData.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                    />
                    {fieldErrors.businessName && (
                      <p className="text-xs text-destructive">{fieldErrors.businessName}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Dialog
                    open={resetOpen}
                    onOpenChange={(open) => {
                      setResetOpen(open);
                      if (open) {
                        setResetForm((prev) => ({
                          ...prev,
                          email: formData.email || prev.email,
                        }));
                      } else {
                        setResetStep('request');
                        setResetError(null);
                        setResetNotice(null);
                        setResetForm({
                          email: '',
                          token: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-[480px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4" />
                          Reset password
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {resetError && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{resetError}</span>
                          </div>
                        )}
                        {resetNotice && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span>{resetNotice}</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="you@example.com"
                            value={resetForm.email}
                            onChange={(e) =>
                              setResetForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                            disabled={resetStep === 'verify'}
                          />
                        </div>

                        {resetStep === 'verify' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="reset-token">Reset code</Label>
                              <Input
                                id="reset-token"
                                placeholder="Enter the code from your email"
                                value={resetForm.token}
                                onChange={(e) =>
                                  setResetForm((prev) => ({ ...prev, token: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reset-password">New password</Label>
                              <Input
                                id="reset-password"
                                type="password"
                                value={resetForm.newPassword}
                                onChange={(e) =>
                                  setResetForm((prev) => ({
                                    ...prev,
                                    newPassword: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reset-confirm-password">Confirm password</Label>
                              <Input
                                id="reset-confirm-password"
                                type="password"
                                value={resetForm.confirmPassword}
                                onChange={(e) =>
                                  setResetForm((prev) => ({
                                    ...prev,
                                    confirmPassword: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </>
                        )}

                        <Button
                          type="button"
                          className="w-full"
                          onClick={resetStep === 'request' ? handleResetRequest : handleResetVerify}
                          disabled={resetLoading}
                        >
                          {resetLoading
                            ? 'Please wait...'
                            : resetStep === 'request'
                            ? 'Send reset code'
                            : 'Update password'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Create account' : 'Sign in')
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setNotice(null);
                    setFieldErrors({ email: '', password: '', fullName: '', businessName: '' });
                  }}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
