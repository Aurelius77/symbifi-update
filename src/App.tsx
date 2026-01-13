import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { Projects } from "./pages/Projects";
import { Contractors } from "./pages/Contractors";
import { ProjectTeam } from "./pages/ProjectTeam";
import { Payments } from "./pages/Payments";
import { Layout } from "./components/layout/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<Layout><Projects /></Layout>} />
          <Route path="/contractors" element={<Layout><Contractors /></Layout>} />
          <Route path="/project-team" element={<Layout><ProjectTeam /></Layout>} />
          <Route path="/payments" element={<Layout><Payments /></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
