import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, CreditCard, Users, FolderKanban, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
}

const actionIcons: Record<string, typeof Activity> = {
  payment_created: CreditCard,
  payment_updated: CreditCard,
  team_added: Users,
  team_updated: Users,
  project_created: FolderKanban,
  contractor_added: Users,
};

const actionColors: Record<string, string> = {
  payment_created: 'bg-success/10 text-success',
  payment_updated: 'bg-info/10 text-info',
  team_added: 'bg-primary/10 text-primary',
  team_updated: 'bg-warning/10 text-warning',
  project_created: 'bg-primary/10 text-primary',
  contractor_added: 'bg-info/10 text-info',
};

export function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && !error) {
      setActivities(data);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityDetails = (activity: ActivityLogEntry) => {
    const metadata = activity.metadata as Record<string, unknown>;
    
    switch (activity.action_type) {
      case 'payment_created':
        return `${formatCurrency(Number(metadata.amount || 0))} via ${metadata.method || 'N/A'}`;
      case 'payment_updated':
        return `Updated to ${formatCurrency(Number(metadata.amount || 0))}`;
      case 'team_added':
      case 'team_updated':
        return `Status: ${metadata.status || 'N/A'}`;
      default:
        return activity.description;
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold">Recent Activity</h2>
      </div>
      
      {activities.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No recent activity to display
        </p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {activities.map((activity) => {
            const Icon = actionIcons[activity.action_type] || Activity;
            const colorClass = actionColors[activity.action_type] || 'bg-muted text-muted-foreground';
            
            return (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 py-2 border-b border-border last:border-0"
              >
                <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getActivityDetails(activity)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}