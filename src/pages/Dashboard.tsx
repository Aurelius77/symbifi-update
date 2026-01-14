import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderKanban, 
  Users, 
  CreditCard, 
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format, isThisMonth } from 'date-fns';

interface Project {
  id: string;
  name: string;
  total_budget: number;
  status: string;
}

interface Contractor {
  id: string;
  full_name: string;
  status: string;
}

interface Payment {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
}

interface ProjectTeam {
  id: string;
  project_id: string;
  contractor_id: string;
  payment_type: string;
  agreed_amount: number;
  percentage_share: number;
  payment_status: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [projectsRes, contractorsRes, paymentsRes, teamsRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('project_teams').select('*'),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (contractorsRes.data) setContractors(contractorsRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (teamsRes.data) setProjectTeams(teamsRes.data);
    setLoading(false);
  };

  const activeProjects = projects.filter(p => p.status === 'Active');
  const activeContractors = contractors.filter(c => c.status === 'Active');
  const thisMonthPayments = payments.filter(p => isThisMonth(new Date(p.payment_date)));
  
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.total_budget), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  
  const getCalculatedPay = (team: ProjectTeam) => {
    const project = projects.find(p => p.id === team.project_id);
    if (!project) return 0;
    
    if (team.payment_type === 'Fixed Amount') {
      return Number(team.agreed_amount);
    } else {
      return (Number(project.total_budget) * Number(team.percentage_share)) / 100;
    }
  };

  const getTotalPaidForTeam = (projectId: string, contractorId: string) => {
    return payments
      .filter(p => p.project_id === projectId && p.contractor_id === contractorId)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);
  };

  const contractorsWithBalance = projectTeams.filter(team => {
    const calculatedPay = getCalculatedPay(team);
    const totalPaidForTeam = getTotalPaidForTeam(team.project_id, team.contractor_id);
    return calculatedPay > totalPaidForTeam;
  }).length;

  const unpaidContractors = projectTeams.filter(t => t.payment_status === 'Unpaid').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      label: 'Active Projects',
      value: activeProjects.length,
      icon: FolderKanban,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Active Contractors',
      value: activeContractors.length,
      icon: Users,
      color: 'bg-info/10 text-info',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(totalPaid),
      icon: CreditCard,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Outstanding Balances',
      value: contractorsWithBalance,
      icon: AlertCircle,
      color: 'bg-warning/10 text-warning',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome to SymbiFi. Here's an overview of your payroll status.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="order-2 sm:order-1">
                <p className="stat-card-value text-xl sm:text-3xl">{stat.value}</p>
                <p className="stat-card-label text-xs sm:text-sm">{stat.label}</p>
              </div>
              <div className={`stat-card-icon ${stat.color} order-1 sm:order-2 w-8 h-8 sm:w-10 sm:h-10`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Payments */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Payments This Month</h2>
          </div>
          {thisMonthPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No payments recorded this month</p>
          ) : (
            <div className="space-y-3">
              {thisMonthPayments.slice(0, 5).map((payment) => {
                const contractor = contractors.find(c => c.id === payment.contractor_id);
                const project = projects.find(p => p.id === payment.project_id);
                return (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-sm truncate">{contractor?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{project?.name || 'Unknown Project'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-primary">{formatCurrency(Number(payment.amount_paid))}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(payment.payment_date), 'MMM d')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Status Overview */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Project Overview</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium">Active Projects</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-primary">{activeProjects.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                <span className="text-xs sm:text-sm font-medium">Completed Projects</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-success">
                {projects.filter(p => p.status === 'Completed').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                <span className="text-xs sm:text-sm font-medium">Unpaid Assignments</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-warning">{unpaidContractors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 sm:mt-6 bg-card rounded-xl border border-border p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Project Budgets</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-success/10 rounded-lg">
            <p className="text-lg sm:text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Payments Made</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-warning/10 rounded-lg">
            <p className="text-lg sm:text-2xl font-bold text-warning">{formatCurrency(totalBudget - totalPaid)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Remaining Budget</p>
          </div>
        </div>
      </div>
    </div>
  );
}
