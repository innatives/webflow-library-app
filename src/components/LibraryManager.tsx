import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Loader2, Library, AlertCircle, Mail } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface UserLibrary {
  id: string;
  name: string;
  is_shared: boolean;
  created_at: string;
}

interface SharedUser {
  email: string;
  can_edit: boolean;
  can_delete: boolean;
}

interface LibraryManagerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (library: UserLibrary) => void;
  selectedLibraryId?: string;
}

const LibraryManager: React.FC<LibraryManagerProps> = ({ 
  open, 
  onClose, 
  onSelect,
  selectedLibraryId 
}) => {
  const [libraries, setLibraries] = useState<UserLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [creatingLibrary, setCreatingLibrary] = useState(false);
  const [editLibrary, setEditLibrary] = useState<UserLibrary | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [libraryToDelete, setLibraryToDelete] = useState<string | null>(null);
  const [deletingLibrary, setDeletingLibrary] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [libraryItems, setLibraryItems] = useState<number>(0);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user && open) {
      fetchLibraries();
    }
  }, [user, open]);
  
  useEffect(() => {
    if (libraryToDelete) {
      checkLibraryItems(libraryToDelete);
    }
  }, [libraryToDelete]);

  useEffect(() => {
    if (editLibrary?.is_shared) {
      fetchSharedUsers(editLibrary.id);
    }
  }, [editLibrary]);

  const fetchSharedUsers = async (libraryId: string) => {
    try {
      const { data: permissions, error } = await supabase
        .from('shared_library_permissions')
        .select(`
          shared_with,
          can_edit,
          can_delete
        `)
        .eq('library_id', libraryId);

      if (error) throw error;

      if (permissions) {
        // Fetch emails for each user
        const userEmails = await Promise.all(
          permissions.map(async (perm) => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('email')
                .eq('id', perm.shared_with)
                .maybeSingle();

              if (userError) {
                console.error('Error fetching user data:', userError);
                return {
                  email: 'Unknown User',
                  can_edit: perm.can_edit,
                  can_delete: perm.can_delete
                };
              }

              return {
                email: userData?.email || 'Unknown User',
                can_edit: perm.can_edit,
                can_delete: perm.can_delete
              };
            } catch (error) {
              console.error('Error in user fetch:', error);
              return {
                email: 'Unknown User',
                can_edit: perm.can_edit,
                can_delete: perm.can_delete
              };
            }
          })
        );

        setSharedUsers(userEmails);
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
      toast({
        title: "Error fetching shared users",
        description: "Failed to load shared user information",
        variant: "destructive"
      });
    }
  };

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('user_libraries')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setLibraries(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching libraries",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLibraryItems = async (libraryId: string) => {
    try {
      const { count, error } = await supabase
        .from('shared_clipboard_items')
        .select('*', { count: 'exact', head: true })
        .eq('library_id', libraryId);

      if (error) throw error;
      
      setLibraryItems(count || 0);
    } catch (error: any) {
      console.error("Error checking library items:", error);
      setLibraryItems(0);
    }
  };

  const handleCreateLibrary = async () => {
    if (!newLibraryName.trim() || !user) return;

    try {
      setCreatingLibrary(true);

      const { data, error } = await supabase
        .from('user_libraries')
        .insert({
          name: newLibraryName.trim(),
          created_by: user.id,
          is_shared: isShared
        })
        .select()
        .single();

      if (error) throw error;

      setLibraries([...libraries, data]);
      setNewLibraryName('');
      setIsShared(false);

      toast({
        title: "Library created",
        description: `"${data.name}" library has been created.`
      });
    } catch (error: any) {
      toast({
        title: "Error creating library",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreatingLibrary(false);
    }
  };

  const handleUpdateLibrary = async () => {
    if (!editLibrary) return;

    try {
      const { data, error } = await supabase
        .from('user_libraries')
        .update({ 
          name: editLibrary.name.trim(),
          is_shared: editLibrary.is_shared 
        })
        .eq('id', editLibrary.id)
        .select()
        .single();

      if (error) throw error;

      setLibraries(libraries.map(lib => lib.id === data.id ? data : lib));
      setEditLibrary(null);

      toast({
        title: "Library updated",
        description: `"${data.name}" library has been updated.`
      });
    } catch (error: any) {
      toast({
        title: "Error updating library",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setLibraryToDelete(id);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteLibrary = async () => {
    if (!libraryToDelete || !user) {
      setDeleteDialogOpen(false);
      return;
    }

    if (libraries.length <= 1) {
      toast({
        title: "Cannot delete library",
        description: "You must have at least one library.",
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setDeletingLibrary(true);

      const { error: updateError } = await supabase
        .from('shared_clipboard_items')
        .update({ library_id: null })
        .eq('library_id', libraryToDelete);

      if (updateError) throw updateError;
      
      const { error: deleteError } = await supabase
        .from('user_libraries')
        .delete()
        .eq('id', libraryToDelete);

      if (deleteError) throw deleteError;

      setLibraries(libraries.filter(lib => lib.id !== libraryToDelete));

      if (selectedLibraryId === libraryToDelete && libraries.length > 0) {
        const remainingLib = libraries.find(lib => lib.id !== libraryToDelete);
        if (remainingLib) {
          onSelect(remainingLib);
        }
      }

      toast({
        title: "Library deleted",
        description: "Library has been deleted successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting library",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingLibrary(false);
      setDeleteDialogOpen(false);
      setLibraryToDelete(null);
      setDeleteConfirmText('');
    }
  };

  const getLibraryName = (id: string | null) => {
    if (!id) return '';
    const library = libraries.find(lib => lib.id === id);
    return library ? library.name : '';
  };

  const isDeleteButtonDisabled = deleteConfirmText !== 'DELETE' || deletingLibrary;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library size={18} /> Manage Your Libraries
            </DialogTitle>
            <DialogDescription>
              Create and manage your clipboard libraries. Select a library to save items to it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {libraries.map((library) => (
                    <Card 
                      key={library.id} 
                      className={`overflow-hidden transition ${selectedLibraryId === library.id ? 'border-primary' : ''}`}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          {editLibrary?.id === library.id ? (
                            <div className="space-y-2">
                              <Input 
                                value={editLibrary.name} 
                                onChange={e => setEditLibrary({...editLibrary, name: e.target.value})} 
                                className="w-full"
                              />
                              
                              <div className="flex items-center space-x-2">
                                <Switch 
                                  id={`share-lib-${library.id}`}
                                  checked={editLibrary.is_shared}
                                  onCheckedChange={(checked) => setEditLibrary({...editLibrary, is_shared: checked})}
                                />
                                <Label htmlFor={`share-lib-${library.id}`}>Shared library</Label>
                              </div>

                              {editLibrary.is_shared && sharedUsers.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Mail size={14} />
                                    Shared with:
                                  </h4>
                                  <div className="space-y-2">
                                    {sharedUsers.map((sharedUser, index) => (
                                      <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span>{sharedUser.email}</span>
                                        <span className="text-xs">
                                          ({[
                                            sharedUser.can_edit && 'can edit',
                                            sharedUser.can_delete && 'can delete'
                                          ].filter(Boolean).join(', ') || 'view only'})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex space-x-2 mt-2">
                                <Button size="sm" onClick={handleUpdateLibrary}>Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditLibrary(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center">
                                <button 
                                  className="font-medium text-left cursor-pointer hover:text-primary transition-colors flex-1"
                                  onClick={() => onSelect(library)}
                                >
                                  {library.name}
                                </button>
                              </div>
                              {library.is_shared && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Shared library
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {editLibrary?.id !== library.id && (
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditLibrary(library)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive/90"
                              onClick={() => openDeleteConfirmation(library.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="pt-2 border-t mt-4">
                  <h3 className="text-sm font-medium mb-2">Create new library</h3>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Library name"
                      value={newLibraryName}
                      onChange={e => setNewLibraryName(e.target.value)}
                    />
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Switch 
                        id="new-lib-shared"
                        checked={isShared}
                        onCheckedChange={setIsShared}
                      />
                      <Label htmlFor="new-lib-shared">Shared library</Label>
                    </div>
                    
                    <Button 
                      onClick={handleCreateLibrary} 
                      disabled={!newLibraryName.trim() || creatingLibrary}
                      className="w-full"
                    >
                      {creatingLibrary ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="mr-2" />
                          Create Library
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle size={18} /> Delete Library
            </AlertDialogTitle>
            <AlertDialogDescription>
              {libraryItems > 0 
                ? `This library contains ${libraryItems} item${libraryItems === 1 ? '' : 's'}. Deleting it will disassociate all items from this library.` 
                : "Are you sure you want to delete this library?"}
              <br/><br/>
              The items will remain in your account but won't be associated with any library.
              <br/><br/>
              To confirm deletion of "{getLibraryName(libraryToDelete)}", please type <strong>DELETE</strong> below:
            </AlertDialogDescription>
            
            <div className="mt-4">
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="mt-2"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLibrary}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLibrary}
              disabled={isDeleteButtonDisabled}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingLibrary ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Library"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LibraryManager;