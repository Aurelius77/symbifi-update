import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Briefcase, Building2, KeyRound, LogOut, Mail, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export function Settings() {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);


  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handlePasswordUpdate = async () => {
    setPasswordError(null);

    if (!user?.email) {
      setPasswordError('Missing account email. Please re-authenticate.');
      return;
    }

    if (passwordForm.currentPassword.trim().length === 0) {
      setPasswordError('Enter your current password to confirm.');
      return;
    }

    if (passwordForm.newPassword.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordForm.currentPassword,
    });

    if (signInError) {
      setPasswordError('Current password is incorrect.');
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });

    if (error) {
      toast.error(error.message || 'Failed to update password.');
    } else {
      toast.success('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }

    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim() !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion.');
      return;
    }

    setDeleteLoading(true);
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      toast.error(error.message || 'Failed to delete account.');
      setDeleteLoading(false);
      return;
    }

    toast.success('Account deleted.');
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Manage your account, security, and business profile</p>
      </div>

      <div className="space-y-6 max-w-6xl">
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Profile Snapshot</h2>
              <p className="text-sm text-muted-foreground">
                Quick overview of the essentials tied to this account.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                Full name
              </div>
              <p className="font-medium text-sm sm:text-base break-all">
                {profile.full_name || (user?.user_metadata?.full_name as string | undefined) || 'Not set'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                Email
              </div>
              <p className="font-medium text-sm sm:text-base break-all">{user?.email || '-'}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                Business name
              </div>
              <p className="font-medium text-sm sm:text-base">
                {profile.business_name || 'Not set'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                Industry
              </div>
              <p className="font-medium text-sm sm:text-base">
                {profile.industry || 'Not set'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business Profile</p>
              <ProfileSettings />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>Set a new password for this account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                      setPasswordError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                      setPasswordError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                      setPasswordError(null);
                    }}
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
                <Button onClick={handlePasswordUpdate} disabled={passwordLoading}>
                  {passwordLoading ? 'Updating password...' : 'Update password'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use at least 6 characters with a mix of letters and numbers.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  Session
                </CardTitle>
                <CardDescription>Sign out from this device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                  Log out
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can sign back in anytime with your email or Google.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Delete account
                </CardTitle>
                <CardDescription>This permanently removes your account and data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Delete account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. It will remove your account, projects,
                        contractors, and payments. Type DELETE to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm">Confirmation</Label>
                      <Input
                        id="delete-confirm"
                        placeholder="Type DELETE"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm.trim() !== 'DELETE' || deleteLoading}
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground">
                  Keep a backup of important records before proceeding.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
