import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { HomeRoute } from "./components/auth/HomeRoute";
import { Layout } from "./components/layout/Layout";
import { Landing } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { SuperAdminLogin } from "./pages/SuperAdminLogin";
import { Projects } from "./pages/Projects";
import { Contractors } from "./pages/Contractors";
import { ProjectTeam } from "./pages/ProjectTeam";
import { Payments } from "./pages/Payments";
import { Expenses } from "./pages/Expenses";
import { PaymentSummary } from "./pages/PaymentSummary";
import { PayrollReports } from "./pages/PayrollReports";
import { Payslips } from "./pages/Payslips";
import { Pricing } from "./pages/Pricing";
import { Settings } from "./pages/Settings";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { SuperAdminRoute } from "./components/auth/SuperAdminRoute";
import { SuperAdminClients } from "./pages/SuperAdminClients";
import { SuperAdminClientDetail } from "./pages/SuperAdminClientDetail";
import { SuperAdminProjects } from "./pages/SuperAdminProjects";
import { SuperAdminContractors } from "./pages/SuperAdminContractors";
import { SuperAdminPayments } from "./pages/SuperAdminPayments";
import { SuperAdminSubscriptions } from "./pages/SuperAdminSubscriptions";
import { SuperAdminPaymentDetail } from "./pages/SuperAdminPaymentDetail";
import { SuperAdminContractorDetail } from "./pages/SuperAdminContractorDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/" element={<HomeRoute />} />
            <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
            <Route path="/contractors" element={<ProtectedRoute><Layout><Contractors /></Layout></ProtectedRoute>} />
            <Route path="/project-team" element={<ProtectedRoute><Layout><ProjectTeam /></Layout></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
            <Route path="/payment-summary" element={<ProtectedRoute><Layout><PaymentSummary /></Layout></ProtectedRoute>} />
            <Route path="/payroll-reports" element={<ProtectedRoute><Layout><PayrollReports /></Layout></ProtectedRoute>} />
            <Route path="/payslips" element={<ProtectedRoute><Layout><Payslips /></Layout></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Layout><Pricing /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/super-admin/clients" element={<SuperAdminRoute><SuperAdminClients /></SuperAdminRoute>} />
            <Route path="/super-admin/clients/:clientId" element={<SuperAdminRoute><SuperAdminClientDetail /></SuperAdminRoute>} />
            <Route path="/super-admin/projects" element={<SuperAdminRoute><SuperAdminProjects /></SuperAdminRoute>} />
            <Route path="/super-admin/contractors" element={<SuperAdminRoute><SuperAdminContractors /></SuperAdminRoute>} />
            <Route path="/super-admin/contractors/:contractorId" element={<SuperAdminRoute><SuperAdminContractorDetail /></SuperAdminRoute>} />
            <Route path="/super-admin/payments" element={<SuperAdminRoute><SuperAdminPayments /></SuperAdminRoute>} />
            <Route path="/super-admin/payments/:paymentId" element={<SuperAdminRoute><SuperAdminPaymentDetail /></SuperAdminRoute>} />
            <Route path="/super-admin/subscriptions" element={<SuperAdminRoute><SuperAdminSubscriptions /></SuperAdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
