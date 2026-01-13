import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1 className="page-title">Settings</h1><p className="page-description">Manage your account and preferences</p></div>
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
            <div><p className="text-sm text-muted-foreground">User ID</p><p className="font-mono text-sm">{user?.id}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Role</CardTitle></CardHeader>
          <CardContent><span className={`badge-status ${userRole === 'admin' ? 'badge-paid' : 'badge-active'}`}>{userRole || 'user'}</span><p className="text-sm text-muted-foreground mt-2">{userRole === 'admin' ? 'You have full administrative access.' : 'Standard user access.'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sign Out</CardTitle></CardHeader>
          <CardContent><Button variant="destructive" onClick={handleSignOut} className="gap-2"><LogOut className="w-4 h-4" />Sign out</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
