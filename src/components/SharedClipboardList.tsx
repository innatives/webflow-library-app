import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LogIn, Users, Share } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SharedClipboardItem from './SharedClipboardItem';
import { Button } from './ui/button';
import LibrarySharingManager from './LibrarySharingManager';

interface SharedClipboardListProps {
  selectedLibraryId?: string | null;
}

interface SharedItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  created_at: string;
  created_by: string | null;
  screenshot_url?: string | null;
  library_id: string | null;
}

const SharedClipboardList: React.FC<SharedClipboardListProps> = ({ selectedLibraryId }) => {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingOpen, setSharingOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && selectedLibraryId) {
      fetchSharedItems(selectedLibraryId);
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [user, selectedLibraryId]);

  const fetchSharedItems = async (libraryId: string) => {
    setLoading(true);
    try {
      const { data: items, error: itemsError } = await supabase
        .from('shared_clipboard_items')
        .select('*')
        .eq('library_id', libraryId)
        .order('created_at', { ascending: false });
        
      if (itemsError) throw itemsError;
      setItems(items || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Error fetching items',
        description: error.message || 'Failed to load shared items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete items",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    try {
      const { error } = await supabase
        .from('shared_clipboard_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
      
      toast({
        title: "Item deleted",
        description: "The shared item has been removed"
      });
    } catch (error: any) {
      let errorMessage = error.message || "You may not have permission to delete this item";

      if (error.message?.includes('row-level security policy')) {
        errorMessage = "You don't have permission to delete this item";
      }
      
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 border rounded-md">
        <LogIn className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">Sign in to view shared clipboard items</p>
        <Button onClick={() => navigate('/auth')} variant="outline" className="mt-2">
          Sign in
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Clipboard Library</h2>
        <Button variant="outline" size="sm" onClick={() => setSharingOpen(true)} className="gap-2">
          <Share size={14} />
          Share Library
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <p className="text-muted-foreground">No items in this library yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Use the clipboard parser to add items to this library
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <SharedClipboardItem key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
      
      {sharingOpen && selectedLibraryId && (
        <LibrarySharingManager 
          onClose={() => setSharingOpen(false)} 
          libraryId={selectedLibraryId}
        />
      )}
    </>
  );
};

export default SharedClipboardList;