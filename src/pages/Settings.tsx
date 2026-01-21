import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export function Settings() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Manage your account and preferences</p>
      </div>
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Account Overview</h2>
              <p className="text-sm text-muted-foreground">
                Review your account identity and access at a glance.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="text-sm font-medium break-all">{user?.email || '-'}</div>
              <span className={`badge-status ${userRole === 'admin' ? 'badge-paid' : 'badge-active'}`}>
                {userRole || 'user'}
              </span>
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
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  Account Details
                </CardTitle>
                <CardDescription>Primary identity information for your account.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm sm:text-base break-all">{user?.email || '-'}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs sm:text-sm break-all">{user?.id || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  Access & Role
                </CardTitle>
                <CardDescription>Permissions applied to this account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Role</span>
                    <span className={`badge-status ${userRole === 'admin' ? 'badge-paid' : 'badge-active'}`}>
                      {userRole || 'user'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    {userRole === 'admin' ? 'You have full administrative access.' : 'Standard user access.'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <p className="text-sm text-muted-foreground">Account Identifier</p>
                  <p className="font-mono text-xs sm:text-sm break-all mt-1">{user?.id || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Sign Out</CardTitle>
                <CardDescription>End your current session on this device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="destructive" onClick={handleSignOut} className="gap-2 w-full">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can sign back in anytime with your email and password.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
