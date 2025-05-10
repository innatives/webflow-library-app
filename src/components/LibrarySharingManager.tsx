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
  DialogTitle,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SharePermission {
  id: string;
  shared_with: string;
  can_edit: boolean;
  can_delete: boolean;
}

interface LibrarySharingManagerProps {
  onClose: () => void;
  libraryId: string;
}

const LibrarySharingManager: React.FC<LibrarySharingManagerProps> = ({ onClose, libraryId }) => {
  const [email, setEmail] = useState('');
  const [sharedPermissions, setSharedPermissions] = useState<SharePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [libraryName, setLibraryName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchExistingPermissions();
      fetchLibraryName();
    }
  }, [user, libraryId]);

  const fetchLibraryName = async () => {
    if (!user || !libraryId) return;

    try {
      const { data, error } = await supabase
        .from('user_libraries')
        .select('name, is_shared')
        .eq('id', libraryId)
        .single();
      
      if (error) throw error;
      if (data) {
        setLibraryName(data.name);
        
        // If library is not shared, update it
        if (!data.is_shared) {
          const { error: updateError } = await supabase
            .from('user_libraries')
            .update({ is_shared: true })
            .eq('id', libraryId);
            
          if (updateError) throw updateError;
        }
      }
    } catch (error) {
      console.error('Error fetching library name:', error);
    }
  };

  const fetchExistingPermissions = async () => {
    if (!user || !libraryId) return;

    try {
      setLoadingPermissions(true);
      
      const { data: permissions, error } = await supabase
        .from('shared_library_permissions')
        .select(`
          id,
          shared_with,
          can_edit,
          can_delete,
          users!shared_library_permissions_shared_with_fkey (
            email
          )
        `)
        .eq('shared_by', user.id)
        .eq('library_id', libraryId);
      
      if (error) throw error;
      
      if (permissions) {
        setSharedPermissions(permissions.map(perm => ({
          id: perm.id,
          shared_with: perm.shared_with,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
          email: perm.users?.email
        })));
      }
    } catch (error: any) {
      toast({
        title: "Error fetching sharing permissions",
        description: error.message || "An error occurred fetching permissions",
        variant: "destructive"
      });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim() || !user || !libraryId) return;
    
    setLoading(true);
    
    try {
      // Use the database function to get the user ID from email
      const { data: userData, error: userError } = await supabase.rpc(
        'get_user_id_by_email',
        { email_input: email.toLowerCase().trim() }
      );
      
      if (userError || !userData) {
        toast({
          title: "User not found",
          description: "No user with that email address was found",
          variant: "destructive"
        });
        return;
      }
      
      const recipientId = userData;
      
      // Don't allow sharing with self
      if (recipientId === user.id) {
        toast({
          title: "Cannot share with yourself",
          description: "You already have full access to your own library",
          variant: "destructive"
        });
        return;
      }
      
      // Create permission record for this specific library
      const { data, error } = await supabase
        .from('shared_library_permissions')
        .insert({
          shared_by: user.id,
          shared_with: recipientId,
          can_edit: false,
          can_delete: false,
          library_id: libraryId
        })
        .select()
        .single();
      
      if (error) {
        // Check if this is a unique violation (already shared)
        if (error.code === '23505') {
          toast({
            title: "Already shared",
            description: `You've already shared "${libraryName}" with this user`,
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Library shared",
          description: `"${libraryName}" has been shared with ${email}`,
        });
        setEmail('');
        
        // Refresh permissions list
        fetchExistingPermissions();
      }
    } catch (error: any) {
      toast({
        title: "Error sharing library",
        description: error.message || "An error occurred while sharing the library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermissions = async (id: string, field: 'can_edit' | 'can_delete', value: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('shared_library_permissions')
        .update({ [field]: value })
        .eq('id', id)
        .eq('shared_by', user.id);
      
      if (error) throw error;
      
      // Update local state
      setSharedPermissions(prev => 
        prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      );
      
      toast({
        title: "Permissions updated",
        description: `Sharing permission has been updated`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating permissions",
        description: error.message || "An error occurred updating permissions",
        variant: "destructive"
      });
    }
  };

  const removeSharing = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('shared_library_permissions')
        .delete()
        .eq('id', id)
        .eq('shared_by', user.id);
      
      if (error) throw error;
      
      // Update local state
      setSharedPermissions(prev => prev.filter(p => p.id !== id));
      
      toast({
        title: "Sharing removed",
        description: "This user no longer has access to your library",
      });
    } catch (error: any) {
      toast({
        title: "Error removing sharing",
        description: error.message || "An error occurred removing sharing permission",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share size={18} /> Share "{libraryName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-end gap-2 mb-6">
            <div className="flex-1">
              <Label htmlFor="email" className="text-sm font-medium mb-1 block">User Email</Label>
              <Input 
                id="email"
                placeholder="user@example.com" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <Button 
              onClick={handleShare} 
              disabled={loading || !email.trim()}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share size={16} />}
              Share
            </Button>
          </div>
          
          <div>
            <div className="flex items-center mb-4">
              <Users size={18} className="mr-2" />
              <h3 className="font-medium">Shared With</h3>
            </div>
            
            {loadingPermissions ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sharedPermissions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>You haven't shared "{libraryName}" with anyone yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedPermissions.map(permission => (
                  <Card key={permission.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-sm truncate">
                            {permission.email}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSharing(permission.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`edit-${permission.id}`}
                              checked={permission.can_edit}
                              onCheckedChange={(checked) => {
                                updatePermissions(permission.id, 'can_edit', checked);
                              }}
                            />
                            <Label htmlFor={`edit-${permission.id}`}>Can edit</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`delete-${permission.id}`}
                              checked={permission.can_delete}
                              onCheckedChange={(checked) => {
                                updatePermissions(permission.id, 'can_delete', checked);
                              }}
                            />
                            <Label htmlFor={`delete-${permission.id}`}>Can delete</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LibrarySharingManager;