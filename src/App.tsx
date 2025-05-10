import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./components/Auth";
import { AuthProvider } from "./context/AuthContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { ClipboardList, Library, FolderOpen, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

const App = () => {
  const [libraries, setLibraries] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLibraries();
    }
  }, [user]);

  const fetchLibraries = async () => {
    try {
      const { data, error } = await supabase
        .from('user_libraries')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLibraries(data || []);
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
              <Sidebar variant="inset">
                <SidebarHeader className="flex items-center gap-2 px-4">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="font-medium text-base">Webflow Elements</span>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button className="w-full flex items-center gap-2 text-muted-foreground">
                          <Library className="h-4 w-4" />
                          <span>Libraries</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {libraries.map((library: any) => (
                      <SidebarMenuItem key={library.id}>
                        <SidebarMenuButton asChild>
                          <button className="w-full flex items-center gap-2 pl-6 text-muted-foreground">
                            <FolderOpen className="h-4 w-4" />
                            <span>{library.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button className="w-full flex items-center gap-2 pl-6 text-muted-foreground">
                          <Plus className="h-4 w-4" />
                          <span>New Library</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
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
};

export default App;