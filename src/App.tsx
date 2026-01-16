import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { Contractors } from "./pages/Contractors";
import { ProjectTeam } from "./pages/ProjectTeam";
import { Payments } from "./pages/Payments";
import { Expenses } from "./pages/Expenses";
import { PaymentSummary } from "./pages/PaymentSummary";
import { PayrollReports } from "./pages/PayrollReports";
import { Payslips } from "./pages/Payslips";
import { Settings } from "./pages/Settings";
import { AdminUsers } from "./pages/AdminUsers";
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
            <Route path="/contractors" element={<ProtectedRoute><Layout><Contractors /></Layout></ProtectedRoute>} />
            <Route path="/project-team" element={<ProtectedRoute><Layout><ProjectTeam /></Layout></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
            <Route path="/payment-summary" element={<ProtectedRoute><Layout><PaymentSummary /></Layout></ProtectedRoute>} />
            <Route path="/payroll-reports" element={<ProtectedRoute><Layout><PayrollReports /></Layout></ProtectedRoute>} />
            <Route path="/payslips" element={<ProtectedRoute><Layout><Payslips /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><Layout><AdminUsers /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
