import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LogIn, Users, Share, Library, FolderPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SharedClipboardItem from './SharedClipboardItem';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import LibrarySharingManager from './LibrarySharingManager';
import LibrarySelector from './LibrarySelector';
import { Label } from './ui/label';

interface UserLibrary {
  id: string;
  name: string;
  is_shared: boolean;
  created_at: string;
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

const SharedClipboardList: React.FC = () => {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [sharedWithMeItems, setSharedWithMeItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<UserLibrary | null>(null);
  const [libraries, setLibraries] = useState<UserLibrary[]>([]);
  const [managingLibraries, setManagingLibraries] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-items');

  useEffect(() => {
    if (user) {
      fetchLibraries();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  const fetchLibraries = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_libraries')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setLibraries(data || []);
      
      // Select the first library by default if available
      if (data && data.length > 0) {
        setSelectedLibrary(data[0]);
        fetchSharedItems(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
      setLoading(false);
    }
  };

  const fetchSharedItems = async (libraryId: string) => {
    setLoading(true);
    try {
      // Fetch the user's own items for the selected library
      const { data: myItems, error: myItemsError } = await supabase
        .from('shared_clipboard_items')
        .select('*')
        .eq('created_by', user?.id)
        .eq('library_id', libraryId)
        .order('created_at', { ascending: false });
        
      if (myItemsError) throw myItemsError;
      setItems(myItems || []);

      // Fetch items shared with the user
      const { data: sharedPermissions, error: permError } = await supabase
        .from('shared_library_permissions')
        .select('shared_by, library_id, can_edit, can_delete')
        .eq('shared_with', user?.id);
        
      if (permError) throw permError;
      
      if (sharedPermissions && sharedPermissions.length > 0) {
        // Collect all library IDs that are shared with the user
        const sharedLibraryIds = sharedPermissions.map(perm => perm.library_id).filter(Boolean);
        
        if (sharedLibraryIds.length > 0) {
          // Fetch items from those shared libraries
          const { data: sharedItems, error: sharedItemsError } = await supabase
            .from('shared_clipboard_items')
            .select('*')
            .in('library_id', sharedLibraryIds)
            .order('created_at', { ascending: false });
            
          if (sharedItemsError) throw sharedItemsError;
          setSharedWithMeItems(sharedItems || []);
        } else {
          setSharedWithMeItems([]);
        }
      } else {
        setSharedWithMeItems([]);
      }
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

      // Update the correct list
      const itemToDelete = items.find(item => item.id === id) || sharedWithMeItems.find(item => item.id === id);
      if (itemToDelete && itemToDelete.created_by === user.id) {
        setItems(items.filter(item => item.id !== id));
      } else {
        setSharedWithMeItems(sharedWithMeItems.filter(item => item.id !== id));
      }
      
      toast({
        title: "Item deleted",
        description: "The shared item has been removed"
      });
    } catch (error: any) {
      let errorMessage = error.message || "You may not have permission to delete this item";

      // Check if this is an RLS error
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

  const handleLibraryChange = (library: UserLibrary) => {
    setSelectedLibrary(library);
    fetchSharedItems(library.id);
  };

  if (!user) {
    return <div className="text-center py-12 border rounded-md">
        <LogIn className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">Sign in to view shared clipboard items</p>
        <Button onClick={() => navigate('/auth')} variant="outline" className="mt-2">
          Sign in
        </Button>
      </div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }

  if (libraries.length === 0) {
    return <div className="text-center py-12 border rounded-md">
        <Library className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">You don't have any libraries yet</p>
        <Button onClick={() => setManagingLibraries(true)} variant="outline" className="mt-2 gap-2">
          <FolderPlus size={16} />
          Create Your First Library
        </Button>
        
        <LibrarySelector
          selectedLibraryId={null}
          onLibraryChange={handleLibraryChange}
          disabled={false}
        />
      </div>;
  }

  const renderItems = (itemsList: SharedItem[], isSharedWithMe = false) => {
    if (itemsList.length === 0) {
      return <div className="text-center py-12 border rounded-md">
          <p className="text-muted-foreground">
            {isSharedWithMe ? "No items have been shared with you yet" : "You haven't saved any clipboard items to this library yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isSharedWithMe ? "When someone shares their library with you, items will appear here" : "Save clipboard items using the \"Save to Library\" button"}
          </p>
        </div>;
    }
    return <div className="space-y-4">
        {itemsList.map(item => <SharedClipboardItem key={item.id} item={item} onDelete={handleDelete} />)}
      </div>;
  };

  return <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Clipboard Library</h2>
        <Button variant="outline" size="sm" onClick={() => setSharingOpen(true)} className="gap-2">
          <Share size={14} />
          Share Library
        </Button>
      </div>
      
      <div className="mb-4">
        <Label className="text-sm mb-1 block">Selected Library</Label>
        <LibrarySelector
          selectedLibraryId={selectedLibrary?.id || null}
          onLibraryChange={handleLibraryChange}
        />
      </div>
      
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="my-items" className="flex gap-2 items-center">
            <Users size={14} />
            My Items
          </TabsTrigger>
          <TabsTrigger value="shared-with-me" className="flex gap-2 items-center">
            <Share size={14} />
            Shared with me
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-items" className="space-y-4">
          {renderItems(items)}
        </TabsContent>
        
        <TabsContent value="shared-with-me" className="space-y-4">
          {renderItems(sharedWithMeItems, true)}
        </TabsContent>
      </Tabs>
      
      {sharingOpen && selectedLibrary && <LibrarySharingManager 
        onClose={() => setSharingOpen(false)} 
        libraryId={selectedLibrary.id}
      />}
    </>;
};

export default SharedClipboardList;
