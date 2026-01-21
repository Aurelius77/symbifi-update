import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { User, Mail, Phone, CreditCard, Briefcase, Calendar, FolderKanban, Wallet } from 'lucide-react';

interface Contractor {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string | null;
  bank_wallet_details: string | null;
  contractor_type: string;
  status: string;
  created_at?: string;
}

interface ViewContractorDialogProps {
  contractor: Contractor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewContractorDialog({ contractor, open, onOpenChange }: ViewContractorDialogProps) {
  const { formatCurrency } = useUserProfile();
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    projectsCount: 0,
    totalIncome: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    if (!contractor || !open) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      setStats({
        projectsCount: 0,
        totalIncome: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      });

      const [teamsRes, paymentsRes] = await Promise.all([
        supabase
          .from('project_teams')
          .select('project_id, agreed_amount, percentage_share, payment_type, projects ( total_budget )')
          .eq('contractor_id', contractor.id),
        supabase
          .from('payments')
          .select('amount_paid')
          .eq('contractor_id', contractor.id),
      ]);

      if (teamsRes.error || paymentsRes.error) {
        setStatsError('Unable to load contractor history.');
        setStatsLoading(false);
        return;
      }

      const teams = (teamsRes.data || []) as Array<{
        project_id: string;
        agreed_amount: number | null;
        percentage_share: number | null;
        payment_type: string;
        projects?: { total_budget: number | null } | null;
      }>;
      const payments = (paymentsRes.data || []) as Array<{ amount_paid: number | null }>;
      const projectsCount = new Set(teams.map((team) => team.project_id)).size;
      const totalIncome = teams.reduce((sum, team) => {
        if (team.payment_type === 'Fixed Amount') {
          return sum + Number(team.agreed_amount || 0);
        }
        const projectBudget = Number(team.projects?.total_budget || 0);
        return sum + (projectBudget * Number(team.percentage_share || 0)) / 100;
      }, 0);
      const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);
      const totalOutstanding = Math.max(totalIncome - totalPaid, 0);

      setStats({
        projectsCount,
        totalIncome,
        totalPaid,
        totalOutstanding,
      });
      setStatsLoading(false);
    };

    fetchStats();
  }, [contractor, open]);

  if (!contractor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="block">{contractor.full_name}</span>
              <span className="text-sm font-normal text-muted-foreground">{contractor.role}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <Badge variant={contractor.status === 'Active' ? 'default' : 'secondary'}>
              {contractor.status}
            </Badge>
            <Badge variant="outline">{contractor.contractor_type}</Badge>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Contact Information
            </h4>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{contractor.email}</p>
                </div>
              </div>

              {contractor.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{contractor.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Professional Details
            </h4>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Role / Skill</p>
                  <p className="text-sm font-medium">{contractor.role}</p>
                </div>
              </div>

              {contractor.created_at && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Added On</p>
                    <p className="text-sm font-medium">
                      {new Date(contractor.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {contractor.bank_wallet_details && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Payment Details
              </h4>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Bank / Wallet Details</p>
                  <p className="text-sm font-medium whitespace-pre-wrap">{contractor.bank_wallet_details}</p>
                </div>
              </div>
            </div>
          )}

          {/* History & Totals */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              History & Totals
            </h4>
            {statsError ? (
              <div className="text-sm text-destructive">{statsError}</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FolderKanban className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Projects</p>
                    <p className="text-sm font-medium">
                      {statsLoading ? 'Loading...' : stats.projectsCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total income</p>
                    <p className="text-sm font-medium">
                      {statsLoading ? 'Loading...' : formatCurrency(stats.totalIncome)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total paid</p>
                    <p className="text-sm font-medium">
                      {statsLoading ? 'Loading...' : formatCurrency(stats.totalPaid)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-sm font-medium">
                      {statsLoading ? 'Loading...' : formatCurrency(stats.totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
