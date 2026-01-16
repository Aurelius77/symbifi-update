import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Filter, Calendar, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-export';

interface Project {
  id: string;
  name: string;
  total_budget: number;
  status: string;
}

interface Contractor {
  id: string;
  full_name: string;
}

interface Payment {
  id: string;
  project_id: string;
  contractor_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
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

interface Expense {
  id: string;
  project_id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
}

export function PayrollReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [projectsRes, contractorsRes, paymentsRes, teamsRes, expensesRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('project_teams').select('*'),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (contractorsRes.data) setContractors(contractorsRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (teamsRes.data) setProjectTeams(teamsRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.full_name || 'Unknown';

  // Apply date filters
  const filteredPayments = payments.filter(p => {
    const paymentDate = parseISO(p.payment_date);
    const inDateRange = isWithinInterval(paymentDate, { start: parseISO(dateFrom), end: parseISO(dateTo) });
    const matchesProject = filterProject === 'all' || p.project_id === filterProject;
    const matchesContractor = filterContractor === 'all' || p.contractor_id === filterContractor;
    return inDateRange && matchesProject && matchesContractor;
  });

  const filteredExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.expense_date);
    const inDateRange = isWithinInterval(expenseDate, { start: parseISO(dateFrom), end: parseISO(dateTo) });
    const matchesProject = filterProject === 'all' || e.project_id === filterProject;
    return inDateRange && matchesProject;
  });

  // Calculate summaries
  const totalPayments = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  // Calculate total budget from filtered projects
  const relevantProjects = filterProject === 'all' ? projects : projects.filter(p => p.id === filterProject);
  const totalBudget = relevantProjects.reduce((sum, p) => sum + Number(p.total_budget), 0);
  
  // Calculate agreed amounts for contractors
  const relevantTeams = projectTeams.filter(t => 
    (filterProject === 'all' || t.project_id === filterProject) &&
    (filterContractor === 'all' || t.contractor_id === filterContractor)
  );
  
  const getCalculatedPay = (team: ProjectTeam) => {
    const project = projects.find(p => p.id === team.project_id);
    if (!project) return 0;
    if (team.payment_type === 'Fixed Amount') {
      return Number(team.agreed_amount);
    }
    return (Number(project.total_budget) * Number(team.percentage_share)) / 100;
  };

  const totalAgreedToContractors = relevantTeams.reduce((sum, t) => sum + getCalculatedPay(t), 0);
  const agencyProfit = totalBudget - totalAgreedToContractors - totalExpenses;
  const paidToContractors = totalPayments;
  const outstandingToContractors = totalAgreedToContractors - paidToContractors;

  // Payment by contractor summary
  const contractorPaymentSummary = contractors.map(contractor => {
    const contractorPayments = filteredPayments.filter(p => p.contractor_id === contractor.id);
    const contractorTeams = relevantTeams.filter(t => t.contractor_id === contractor.id);
    const totalAgreed = contractorTeams.reduce((sum, t) => sum + getCalculatedPay(t), 0);
    const totalPaid = contractorPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    
    return {
      id: contractor.id,
      name: contractor.full_name,
      totalAgreed,
      totalPaid,
      balance: totalAgreed - totalPaid,
      paymentCount: contractorPayments.length,
    };
  }).filter(c => c.totalAgreed > 0 || c.totalPaid > 0);

  // Payment by project summary
  const projectPaymentSummary = relevantProjects.map(project => {
    const projectPayments = filteredPayments.filter(p => p.project_id === project.id);
    const projectExpenses = filteredExpenses.filter(e => e.project_id === project.id);
    const projectTeamsForProject = projectTeams.filter(t => t.project_id === project.id);
    const totalAgreed = projectTeamsForProject.reduce((sum, t) => sum + getCalculatedPay(t), 0);
    const totalPaid = projectPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const totalExp = projectExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    return {
      id: project.id,
      name: project.name,
      budget: project.total_budget,
      agreedToContractors: totalAgreed,
      paidToContractors: totalPaid,
      expenses: totalExp,
      profit: Number(project.total_budget) - totalAgreed - totalExp,
    };
  });

  const handleExportPayrollReport = () => {
    const exportData = contractorPaymentSummary.map(c => ({
      contractor: c.name,
      total_agreed: formatCurrencyForCSV(c.totalAgreed),
      total_paid: formatCurrencyForCSV(c.totalPaid),
      balance_due: formatCurrencyForCSV(c.balance),
      payment_count: c.paymentCount.toString(),
    }));

    exportToCSV(exportData, `payroll-report-${dateFrom}-to-${dateTo}`, {
      contractor: 'Contractor',
      total_agreed: 'Total Agreed (NGN)',
      total_paid: 'Total Paid (NGN)',
      balance_due: 'Balance Due (NGN)',
      payment_count: 'Payment Count',
    });

    toast({ title: 'Payroll report exported to CSV' });
  };

  const handleExportProjectReport = () => {
    const exportData = projectPaymentSummary.map(p => ({
      project: p.name,
      budget: formatCurrencyForCSV(p.budget),
      agreed_to_contractors: formatCurrencyForCSV(p.agreedToContractors),
      paid_to_contractors: formatCurrencyForCSV(p.paidToContractors),
      expenses: formatCurrencyForCSV(p.expenses),
      profit: formatCurrencyForCSV(p.profit),
    }));

    exportToCSV(exportData, `project-financial-report-${dateFrom}-to-${dateTo}`, {
      project: 'Project',
      budget: 'Budget (NGN)',
      agreed_to_contractors: 'Agreed to Contractors (NGN)',
      paid_to_contractors: 'Paid to Contractors (NGN)',
      expenses: 'Expenses (NGN)',
      profit: 'Profit (NGN)',
    });

    toast({ title: 'Project financial report exported to CSV' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Payroll Reports</h1>
          <p className="page-description">Comprehensive payroll and income reports with filters</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExportPayrollReport} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export Payroll
          </Button>
          <Button onClick={handleExportProjectReport} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export Projects
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contractor</label>
            <Select value={filterContractor} onValueChange={setFilterContractor}>
              <SelectTrigger><SelectValue placeholder="All Contractors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contractors</SelectItem>
                {contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Income Overview */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Income Overview (Agency Profit)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Project budgets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">To Contractors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(totalAgreedToContractors)}</p>
              <p className="text-xs text-muted-foreground">Agreed amounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">Project costs</p>
            </CardContent>
          </Card>
          <Card className={agencyProfit >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Agency Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-xl sm:text-2xl font-bold ${agencyProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(agencyProfit)}
              </p>
              <p className="text-xs text-muted-foreground">After contractors & expenses</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Status Overview */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Contractor Payment Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Agreed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalAgreedToContractors)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-success">{formatCurrency(paidToContractors)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-warning">{formatCurrency(outstandingToContractors)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contractor Payment Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Contractor Payment Summary
        </h2>
        {contractorPaymentSummary.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">No contractor data for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contractor</th>
                    <th>Total Agreed</th>
                    <th>Total Paid</th>
                    <th>Balance Due</th>
                    <th>Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {contractorPaymentSummary.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td>{formatCurrency(c.totalAgreed)}</td>
                      <td className="text-success">{formatCurrency(c.totalPaid)}</td>
                      <td className={c.balance > 0 ? 'text-warning font-semibold' : 'text-success'}>
                        {formatCurrency(c.balance)}
                      </td>
                      <td>{c.paymentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden grid gap-4">
              {contractorPaymentSummary.map(c => (
                <div key={c.id} className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold mb-3">{c.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Agreed</p>
                      <p className="font-medium">{formatCurrency(c.totalAgreed)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-success">{formatCurrency(c.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className={`font-semibold ${c.balance > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatCurrency(c.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payments</p>
                      <p className="font-medium">{c.paymentCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Project Financial Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-primary" />
          Project Financial Summary
        </h2>
        {projectPaymentSummary.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">No project data for the selected filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-card rounded-xl border border-border overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Budget</th>
                    <th>Agreed to Contractors</th>
                    <th>Paid to Contractors</th>
                    <th>Expenses</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {projectPaymentSummary.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td>{formatCurrency(p.budget)}</td>
                      <td>{formatCurrency(p.agreedToContractors)}</td>
                      <td className="text-success">{formatCurrency(p.paidToContractors)}</td>
                      <td className="text-destructive">{formatCurrency(p.expenses)}</td>
                      <td className={p.profit >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                        {formatCurrency(p.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden grid gap-4">
              {projectPaymentSummary.map(p => (
                <div key={p.id} className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-semibold mb-3">{p.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-medium">{formatCurrency(p.budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">To Contractors</p>
                      <p className="font-medium">{formatCurrency(p.agreedToContractors)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-success">{formatCurrency(p.paidToContractors)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expenses</p>
                      <p className="font-medium text-destructive">{formatCurrency(p.expenses)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Profit</p>
                      <p className={`text-xl font-bold ${p.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(p.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
