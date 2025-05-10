import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./components/Auth";
import { AuthProvider } from "./context/AuthContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { ClipboardList, Library, FolderOpen, Plus, LogIn, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./components/ui/button";
import LibraryManager from "./components/LibraryManager";
import { Separator } from "./components/ui/separator";

const queryClient = new QueryClient();

interface Library {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  is_shared: boolean;
}

const SidebarContentComponent = () => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [managingLibraries, setManagingLibraries] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedLibraryId = location.state?.selectedLibraryId;

  useEffect(() => {
    if (user) {
      fetchLibraries();
    } else {
      setLibraries([]);
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

  const handleLibraryClick = (libraryId: string) => {
    navigate('/', { state: { selectedLibraryId: libraryId } });
  };

  const handleHomeClick = () => {
    navigate('/', { state: { selectedLibraryId: null } });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <LogIn className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">Sign in to manage your libraries</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={!selectedLibraryId}
              onClick={handleHomeClick}
            >
              <button className="w-full flex items-center gap-2 text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span>Clipboard Parser</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="w-full flex items-center gap-2 text-muted-foreground">
                <Library className="h-4 w-4" />
                <span>Libraries</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {libraries.map((library) => (
            <SidebarMenuItem key={library.id}>
              <SidebarMenuButton 
                asChild 
                isActive={selectedLibraryId === library.id}
                onClick={() => handleLibraryClick(library.id)}
              >
                <button className="w-full flex items-center gap-2 pl-6 text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>{library.name}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button 
                className="w-full flex items-center gap-2 pl-6 text-muted-foreground"
                onClick={() => setManagingLibraries(true)}
              >
                <Plus className="h-4 w-4" />
                <span>New Library</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <SidebarFooter>
        <Separator />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">{user.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>

      {managingLibraries && (
        <LibraryManager
          open={managingLibraries}
          onClose={() => setManagingLibraries(false)}
          onSelect={(library) => {
            setManagingLibraries(false);
            handleLibraryClick(library.id);
            fetchLibraries();
          }}
          selectedLibraryId={selectedLibraryId}
        />
      )}
    </>
  );
};

const App = () => (
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
                <SidebarContentComponent />
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