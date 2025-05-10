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
import { Library, FolderOpen, Plus, LogIn, LogOut, User } from "lucide-react";
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

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 243 245" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
    <g clipPath="url(#clip0_1143_6681)">
      <path d="M106.551 16.2092L16.2183 106.492C5.84442 116.86 0 130.951 0 145.627V240.035C0 242.773 2.20992 244.982 4.94949 244.982H61.7865C64.526 244.982 66.736 242.773 66.736 240.035V85.792C66.736 75.2414 75.2834 66.6987 85.8399 66.6987H238.032C240.772 66.6987 242.982 64.49 242.982 61.752V4.94673C242.982 2.20869 240.772 0 238.032 0H145.709C131.025 0 116.925 5.84116 106.533 16.2092H106.551Z" fill="currentColor"/>
      <path d="M240.518 176.86L110.662 101.947C103.649 97.9133 95.8139 105.744 99.8684 112.735L174.841 242.518C175.718 244.052 177.362 245.001 179.133 245.001H238.052C240.792 245.001 243.002 242.792 243.002 240.054V181.168C243.002 179.397 242.052 177.755 240.518 176.878V176.86Z" fill="currentColor"/>
    </g>
    <defs>
      <clipPath id="clip0_1143_6681">
        <rect width="243" height="245" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

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
                <Logo />
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
              <SidebarHeader className="flex-col p-2 flex gap-2 px-1 justify-start">
                <Logo />
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