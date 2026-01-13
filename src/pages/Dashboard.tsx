import { useStore } from '@/store/useStore';
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

export function Dashboard() {
  const { projects, contractors, payments, projectTeams, getCalculatedPay, getTotalPaidForTeam } = useStore();

  const activeProjects = projects.filter(p => p.status === 'Active');
  const activeContractors = contractors.filter(c => c.status === 'Active');
  const thisMonthPayments = payments.filter(p => isThisMonth(new Date(p.paymentDate)));
  
  const totalBudget = projects.reduce((sum, p) => sum + p.totalBudget, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  
  // Calculate contractors with outstanding balance
  const contractorsWithBalance = projectTeams.filter(team => {
    const calculatedPay = getCalculatedPay(team);
    const totalPaidForTeam = getTotalPaidForTeam(team.projectId, team.contractorId);
    return calculatedPay > totalPaidForTeam;
  }).length;

  const unpaidContractors = projectTeams.filter(t => t.paymentStatus === 'Unpaid').length;

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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome to SymbiFi. Here's an overview of your payroll status.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-card-value">{stat.value}</p>
                <p className="stat-card-label">{stat.label}</p>
              </div>
              <div className={`stat-card-icon ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Payments This Month</h2>
          </div>
          {thisMonthPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No payments recorded this month</p>
          ) : (
            <div className="space-y-3">
              {thisMonthPayments.slice(0, 5).map((payment) => {
                const contractor = contractors.find(c => c.id === payment.contractorId);
                const project = projects.find(p => p.id === payment.projectId);
                return (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm">{contractor?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{project?.name || 'Unknown Project'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-primary">{formatCurrency(payment.amountPaid)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM d')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Status Overview */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Project Overview</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Active Projects</span>
              </div>
              <span className="text-lg font-bold text-primary">{activeProjects.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Completed Projects</span>
              </div>
              <span className="text-lg font-bold text-success">
                {projects.filter(p => p.status === 'Completed').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium">Unpaid Assignments</span>
              </div>
              <span className="text-lg font-bold text-warning">{unpaidContractors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
            <p className="text-sm text-muted-foreground">Total Project Budgets</p>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            <p className="text-sm text-muted-foreground">Total Payments Made</p>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalBudget - totalPaid)}</p>
            <p className="text-sm text-muted-foreground">Remaining Budget</p>
          </div>
        </div>
      </div>
    </div>
  );
}
