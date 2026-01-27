import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wallet, 
  Users, 
  FileText, 
  PieChart, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Contractor Management',
    description: 'Easily manage your team of contractors with detailed profiles, roles, and payment information.'
  },
  {
    icon: Wallet,
    title: 'Payment Tracking',
    description: 'Record and track payments with multiple payment methods, references, and automatic status updates.'
  },
  {
    icon: FileText,
    title: 'Payslip Generation',
    description: 'Generate professional payslips with PDF export that contractors can download or receive via email.'
  },
  {
    icon: PieChart,
    title: 'Financial Reports',
    description: 'Comprehensive payroll reports with filtering by date range, project, and contractor.'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is protected with enterprise-grade security and role-based access controls.'
  },
  {
    icon: Zap,
    title: 'Real-time Activity',
    description: 'Track all changes with real-time activity logs for complete audit trails.'
  }
];

const benefits = [
  'Manage unlimited contractors and projects',
  'Track expenses and calculate agency profit',
  'Export data to CSV for accounting',
  'Role-based access for team members',
  'Mobile-responsive design',
  'Secure cloud-based storage'
];

export function Landing() {
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
              <img src="/pavel-icon.png" alt="Pavel" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Pavel</h1>
              <p className="text-xs text-muted-foreground">Payroll Manager</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {canInstall && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={promptInstall}>
                Install Pavel
              </Button>
            )}
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="w-full sm:w-auto">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs sm:text-sm font-medium mb-5 sm:mb-6">
            <Zap className="w-4 h-4" />
            Streamline your contractor payments
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            Contractor Payroll<br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Pavel helps agencies and businesses manage contractor payments, track expenses, 
            and generate professional payslips — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Everything You Need
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to simplify contractor payroll management for growing businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5 sm:p-6">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                Built for Modern Agencies
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
                Whether you're a freelancer managing subcontractors or an agency with a growing team, 
                Pavel scales with your needs.
              </p>
              <ul className="space-y-3 sm:space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-6 sm:p-8 border border-primary/20">
              <div className="bg-card rounded-xl p-5 sm:p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Agency Profit</p>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">₦2,450,000</p>
                <p className="text-xs sm:text-sm text-green-600">↑ 12% from last month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 bg-primary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-primary-foreground mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg text-primary-foreground/80 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join businesses using Pavel to streamline their contractor payroll management.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
                <img src="/pavel-icon.png" alt="Pavel" className="w-5 h-5 object-contain" />
              </div>
              <span className="font-semibold text-foreground">Pavel</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pavel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
