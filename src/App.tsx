import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./components/Auth";
import { AuthProvider } from "./context/AuthContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarHeader, SidebarInset } from "@/components/ui/sidebar";
import { ClipboardList } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader className="flex items-center gap-2 px-4">
                <ClipboardList className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Webflow Elements</span>
              </SidebarHeader>
              <SidebarContent>
                {/* Sidebar content can be added here */}
              </SidebarContent>
            </Sidebar>
            <SidebarInset>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SidebarInset>
          </SidebarProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;