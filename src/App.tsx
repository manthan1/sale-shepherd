import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CompanySettings from "./pages/CompanySettings";
import ProductCatalog from "./pages/ProductCatalog";
import ProductShortcuts from "./pages/ProductShortcuts";
import SalesOrders from "./pages/SalesOrders";
import TrialDashboard from "./pages/TrialDashboard";
import TeamManagement from "./pages/TeamManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/company-settings" element={<CompanySettings />} />
            <Route path="/product-catalog" element={<ProductCatalog />} />
            <Route path="/product-shortcuts" element={<ProductShortcuts />} />
            <Route path="/sales-orders" element={<SalesOrders />} />
            <Route path="/trial-dashboard" element={<TrialDashboard />} />
            <Route path="/team-management" element={<TeamManagement />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
