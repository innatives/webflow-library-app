import React from 'react';
import { ClipboardList, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
const Navbar: React.FC = () => {
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive'
      });
    }
  };
  return <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Webflow Elements Library</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {!loading && (user ? <div className="flex items-center gap-3">
                <div className="text-sm hidden md:block">
                  <span className="text-muted-foreground">Signed in as </span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div> : <Link to="/auth">
                <Button size="sm" variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              </Link>)}
        </div>
      </div>
    </header>;
};
export default Navbar;