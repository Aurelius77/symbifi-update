import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { FileText, Download, Search, User, Building, Calendar, DollarSign, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  client_name: string;
  total_budget: number;
}

interface Contractor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bank_wallet_details: string | null;
  role: string;
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
  responsibility: string;
}

interface PayslipData {
  contractor: Contractor;
  project: Project;
  team: ProjectTeam;
  payments: Payment[];
  calculatedPay: number;
  totalPaid: number;
  balance: number;
}

export function Payslips() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, profile } = useUserProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [projectsRes, contractorsRes, paymentsRes, teamsRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('project_teams').select('*'),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (contractorsRes.data) setContractors(contractorsRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (teamsRes.data) setProjectTeams(teamsRes.data);
    setLoading(false);
  };

  const getCalculatedPay = (team: ProjectTeam, project: Project) => {
    if (team.payment_type === 'Fixed Amount') {
      return Number(team.agreed_amount);
    }
    return (Number(project.total_budget) * Number(team.percentage_share)) / 100;
  };

  // Generate payslip data for each project-contractor combination
  const payslipDataList: PayslipData[] = projectTeams
    .map(team => {
      const contractor = contractors.find(c => c.id === team.contractor_id);
      const project = projects.find(p => p.id === team.project_id);
      if (!contractor || !project) return null;

      const teamPayments = payments.filter(
        p => p.project_id === team.project_id && p.contractor_id === team.contractor_id
      );
      const calculatedPay = getCalculatedPay(team, project);
      const totalPaid = teamPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

      return {
        contractor,
        project,
        team,
        payments: teamPayments,
        calculatedPay,
        totalPaid,
        balance: calculatedPay - totalPaid,
      };
    })
    .filter((item): item is PayslipData => item !== null);

  // Apply filters
  const filteredPayslips = payslipDataList.filter(p => {
    const matchesSearch =
      p.contractor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || p.project.id === filterProject;
    return matchesSearch && matchesProject;
  });

  const openPayslip = (data: PayslipData) => {
    setSelectedPayslip(data);
    setDialogOpen(true);
  };

  // Escape HTML to prevent XSS attacks when injecting user data into print window
  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handlePrint = () => {
    if (!selectedPayslip) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Please allow popups to print payslips', variant: 'destructive' });
      return;
    }

    // Escape all user-controlled data to prevent XSS
    const safeContractor = {
      full_name: escapeHtml(selectedPayslip.contractor.full_name),
      role: escapeHtml(selectedPayslip.contractor.role),
      email: escapeHtml(selectedPayslip.contractor.email),
      phone: escapeHtml(selectedPayslip.contractor.phone),
      bank_wallet_details: escapeHtml(selectedPayslip.contractor.bank_wallet_details),
    };

    const safeProject = {
      name: escapeHtml(selectedPayslip.project.name),
      client_name: escapeHtml(selectedPayslip.project.client_name),
    };

    const safeTeam = {
      responsibility: escapeHtml(selectedPayslip.team.responsibility),
      payment_type: escapeHtml(selectedPayslip.team.payment_type),
      percentage_share: selectedPayslip.team.percentage_share,
    };

    const safePayments = selectedPayslip.payments.map(p => ({
      id: p.id,
      payment_date: p.payment_date,
      payment_method: escapeHtml(p.payment_method),
      reference: escapeHtml(p.reference),
      amount_paid: p.amount_paid,
    }));

    const paymentRows = safePayments.length === 0 
      ? '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No payments recorded yet</td></tr>'
      : safePayments.map(payment => `
          <tr>
            <td>${format(new Date(payment.payment_date), 'MMM d, yyyy')}</td>
            <td>${payment.payment_method}</td>
            <td style="color: #64748b;">${payment.reference || '-'}</td>
            <td style="text-align: right; font-weight: 500;">${formatCurrency(payment.amount_paid)}</td>
          </tr>
        `).join('');

    const balanceColor = selectedPayslip.balance <= 0 ? '#10b981' : '#f59e0b';

    // Company branding from profile
    const companyName = escapeHtml(profile.business_name) || 'SymbiFi';
    const companyLogo = profile.logo_url ? `<img src="${escapeHtml(profile.logo_url)}" alt="Company Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${safeContractor.full_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; background: white; }
            .payslip { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #0d9488; font-size: 28px; margin-bottom: 5px; }
            .header p { color: #64748b; font-size: 14px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .info-item label { font-size: 12px; color: #64748b; display: block; }
            .info-item span { font-size: 15px; font-weight: 500; color: #1e293b; }
            .payment-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .payment-table th, .payment-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .payment-table th { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .payment-table td { font-size: 14px; }
            .summary { background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 25px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .summary-row.total { border-top: 2px solid #0d9488; padding-top: 15px; margin-top: 10px; font-size: 18px; font-weight: 700; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="payslip">
            <div class="header">
              ${companyLogo}
              <h1>${companyName}</h1>
              <p>Payroll Management System</p>
              <p style="font-size: 12px; margin-top: 10px;">Generated: ${format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
            
            <div class="section">
              <div class="section-title">Contractor Information</div>
              <div class="info-grid">
                <div class="info-item"><label>Name</label><span>${safeContractor.full_name}</span></div>
                <div class="info-item"><label>Role</label><span>${safeContractor.role}</span></div>
                <div class="info-item"><label>Email</label><span>${safeContractor.email}</span></div>
                <div class="info-item"><label>Phone</label><span>${safeContractor.phone || 'N/A'}</span></div>
                ${safeContractor.bank_wallet_details ? `<div class="info-item" style="grid-column: span 2;"><label>Bank/Wallet Details</label><span>${safeContractor.bank_wallet_details}</span></div>` : ''}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Project Information</div>
              <div class="info-grid">
                <div class="info-item"><label>Project Name</label><span>${safeProject.name}</span></div>
                <div class="info-item"><label>Client</label><span>${safeProject.client_name}</span></div>
                <div class="info-item"><label>Responsibility</label><span>${safeTeam.responsibility}</span></div>
                <div class="info-item"><label>Payment Type</label><span>${safeTeam.payment_type === 'Fixed Amount' ? 'Fixed Amount' : `${safeTeam.percentage_share}% of Budget`}</span></div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment History</div>
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>${paymentRows}</tbody>
              </table>
            </div>
            
            <div class="summary">
              <div class="summary-row"><span>Agreed Pay</span><span>${formatCurrency(selectedPayslip.calculatedPay)}</span></div>
              <div class="summary-row"><span>Total Paid</span><span>${formatCurrency(selectedPayslip.totalPaid)}</span></div>
              <div class="summary-row total"><span>Balance Due</span><span style="color: ${balanceColor};">${formatCurrency(selectedPayslip.balance)}</span></div>
            </div>
            
            <div class="footer">
              <p>This is a computer-generated document. No signature is required.</p>
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (balance: number) => {
    if (balance <= 0) return 'text-success';
    if (balance < selectedPayslip?.calculatedPay! * 0.5) return 'text-warning';
    return 'text-destructive';
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
          <h1 className="page-title">Payslips</h1>
          <p className="page-description">Generate and export contractor payslips</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by contractor or project..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Payslip List */}
      {filteredPayslips.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No payslips available</h3>
          <p className="text-muted-foreground">Assign contractors to projects to generate payslips.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayslips.map((data, index) => (
            <div
              key={`${data.team.id}-${index}`}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openPayslip(data)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{data.contractor.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{data.contractor.role}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{data.project.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(data.calculatedPay)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`font-semibold ${data.balance <= 0 ? 'text-success' : 'text-warning'}`}>
                    {formatCurrency(data.balance)}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payslip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Payslip</span>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print / Export PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayslip && (
            <div className="payslip">
              {/* Header with branding */}
              <div className="header text-center border-b-2 border-primary pb-4 mb-6">
                {profile.logo_url && (
                  <img src={profile.logo_url} alt="Company Logo" className="h-12 mx-auto mb-2 object-contain" />
                )}
                <h1 className="text-2xl font-bold text-primary">{profile.business_name || 'SymbiFi'}</h1>
                <p className="text-muted-foreground text-sm">Payroll Management System</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Generated: {format(new Date(), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* Contractor Info */}
              <div className="section mb-6">
                <h3 className="section-title text-sm font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">
                  Contractor Information
                </h3>
                <div className="info-grid grid grid-cols-2 gap-4">
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Name</label>
                    <span className="font-medium">{selectedPayslip.contractor.full_name}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Role</label>
                    <span className="font-medium">{selectedPayslip.contractor.role}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <span className="font-medium">{selectedPayslip.contractor.email}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <span className="font-medium">{selectedPayslip.contractor.phone || 'N/A'}</span>
                  </div>
                  {selectedPayslip.contractor.bank_wallet_details && (
                    <div className="info-item col-span-2">
                      <label className="text-xs text-muted-foreground">Bank/Wallet Details</label>
                      <span className="font-medium">{selectedPayslip.contractor.bank_wallet_details}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Info */}
              <div className="section mb-6">
                <h3 className="section-title text-sm font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">
                  Project Information
                </h3>
                <div className="info-grid grid grid-cols-2 gap-4">
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Project Name</label>
                    <span className="font-medium">{selectedPayslip.project.name}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Client</label>
                    <span className="font-medium">{selectedPayslip.project.client_name}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Responsibility</label>
                    <span className="font-medium">{selectedPayslip.team.responsibility}</span>
                  </div>
                  <div className="info-item">
                    <label className="text-xs text-muted-foreground">Payment Type</label>
                    <span className="font-medium">
                      {selectedPayslip.team.payment_type === 'Fixed Amount' 
                        ? 'Fixed Amount' 
                        : `${selectedPayslip.team.percentage_share}% of Budget`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="section mb-6">
                <h3 className="section-title text-sm font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">
                  Payment History
                </h3>
                {selectedPayslip.payments.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No payments recorded yet</p>
                ) : (
                  <table className="payment-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs text-muted-foreground uppercase py-2">Date</th>
                        <th className="text-left text-xs text-muted-foreground uppercase py-2">Method</th>
                        <th className="text-left text-xs text-muted-foreground uppercase py-2">Reference</th>
                        <th className="text-right text-xs text-muted-foreground uppercase py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPayslip.payments.map(payment => (
                        <tr key={payment.id} className="border-b border-border">
                          <td className="py-2">{format(new Date(payment.payment_date), 'MMM d, yyyy')}</td>
                          <td className="py-2">{payment.payment_method}</td>
                          <td className="py-2 text-muted-foreground">{payment.reference || '-'}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(payment.amount_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Summary */}
              <div className="summary bg-muted/50 rounded-lg p-4">
                <div className="summary-row flex justify-between py-2">
                  <span className="text-muted-foreground">Agreed Pay</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.calculatedPay)}</span>
                </div>
                <div className="summary-row flex justify-between py-2">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-medium text-success">{formatCurrency(selectedPayslip.totalPaid)}</span>
                </div>
                <div className="summary-row total flex justify-between pt-4 mt-2 border-t-2 border-primary">
                  <span className="font-bold">Balance Due</span>
                  <span className={`font-bold text-lg ${getStatusColor(selectedPayslip.balance)}`}>
                    {formatCurrency(selectedPayslip.balance)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="footer mt-8 text-center text-muted-foreground text-xs">
                <p>This is a computer-generated payslip from {profile.business_name || 'SymbiFi'} Payroll Management System.</p>
                <p>© {new Date().getFullYear()} {profile.business_name || 'SymbiFi'}. All rights reserved.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
