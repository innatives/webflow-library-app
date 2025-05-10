import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Share, Users, Loader2, Trash2, Mail } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface LibrarySharingManagerProps {
  onClose: () => void;
  libraryId: string;
}

interface SharedUser {
  id: string;
  email: string;
  can_edit: boolean;
  can_delete: boolean;
  permission_id: string;
}

const LibrarySharingManager: React.FC<LibrarySharingManagerProps> = ({ 
  onClose, 
  libraryId 
}) => {
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [libraryName, setLibraryName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user && libraryId) {
      fetchLibraryName();
      fetchSharedUsers();
    }
  }, [user, libraryId]);

  const fetchLibraryName = async () => {
    try {
      const { data, error } = await supabase
        .from('user_libraries')
        .select('name')
        .eq('id', libraryId)
        .eq('created_by', user?.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Library not found",
            description: "The specified library could not be found or you don't have access to it",
            variant: "destructive"
          });
          onClose();
          return;
        }
        throw error;
      }
      
      if (data) {
        setLibraryName(data.name);
      } else {
        toast({
          title: "Library not found",
          description: "The specified library could not be found or you don't have access to it",
          variant: "destructive"
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Error fetching library name:', error.message);
      toast({
        title: "Error fetching library",
        description: "Failed to load library information. Please try again.",
        variant: "destructive"
      });
      onClose();
    }
  };

  const fetchSharedUsers = async () => {
    try {
      setLoadingPermissions(true);
      
      const { data: permissions, error: permissionsError } = await supabase
        .from('shared_library_permissions')
        .select(`
          id,
          shared_with,
          can_edit,
          can_delete,
          auth:users(email)
        `)
        .eq('shared_by', user?.id)
        .eq('library_id', libraryId);

      if (permissionsError) throw permissionsError;

      if (permissions) {
        const formattedUsers = permissions.map(perm => ({
          id: perm.shared_with,
          email: perm.auth?.[0]?.email || 'Unknown User',
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
          permission_id: perm.id
        }));
        
        setSharedUsers(formattedUsers);
      } else {
        setSharedUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching shared users:', error.message);
      toast({
        title: "Error fetching shared users",
        description: "Failed to load shared user information",
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
      // Get user ID from email
      const { data: userId, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email_input: email.toLowerCase().trim() });
      
      if (userError || !userId) {
        toast({
          title: "User not found",
          description: "No user with that email address was found",
          variant: "destructive"
        });
        return;
      }
      
      // Don't allow sharing with self
      if (userId === user.id) {
        toast({
          title: "Cannot share with yourself",
          description: "You already have full access to your own library",
          variant: "destructive"
        });
        return;
      }

      // Check if permission already exists for this library and user combination
      const { data: existingPermission, error: checkError } = await supabase
        .from('shared_library_permissions')
        .select('id')
        .eq('shared_by', user.id)
        .eq('shared_with', userId)
        .eq('library_id', libraryId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingPermission) {
        toast({
          title: "Already shared",
          description: `You've already shared "${libraryName}" with this user`,
        });
        setEmail('');
        return;
      }
      
      // Create permission record
      const { data: newPermission, error: insertError } = await supabase
        .from('shared_library_permissions')
        .insert({
          shared_by: user.id,
          shared_with: userId,
          can_edit: false,
          can_delete: false,
          library_id: libraryId
        })
        .select(`
          *,
          auth:users(email)
        `)
        .single();
      
      if (insertError) throw insertError;

      // Update library is_shared status
      const { error: updateError } = await supabase
        .from('user_libraries')
        .update({ is_shared: true })
        .eq('id', libraryId)
        .eq('created_by', user.id);

      if (updateError) throw updateError;

      // Add the new user to the list
      if (newPermission) {
        setSharedUsers([...sharedUsers, {
          id: newPermission.shared_with,
          email: newPermission.auth?.[0]?.email || 'Unknown User',
          can_edit: newPermission.can_edit,
          can_delete: newPermission.can_delete,
          permission_id: newPermission.id
        }]);
      }

      toast({
        title: "Library shared",
        description: `"${libraryName}" has been shared with ${email}`,
      });
      setEmail('');
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === '23505') {
        toast({
          title: "Already shared",
          description: `You've already shared "${libraryName}" with this user`,
        });
        setEmail('');
      } else {
        toast({
          title: "Error sharing library",
          description: error.message || "An error occurred while sharing the library",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePermissions = async (permissionId: string, field: 'can_edit' | 'can_delete', value: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_library_permissions')
        .update({ [field]: value })
        .eq('id', permissionId)
        .eq('shared_by', user?.id)
        .eq('library_id', libraryId);
      
      if (error) throw error;
      
      setSharedUsers(prev => 
        prev.map(u => u.permission_id === permissionId ? { ...u, [field]: value } : u)
      );
      
      toast({
        title: "Permissions updated",
        description: "User permissions have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error updating permissions",
        description: error.message || "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  const removeSharing = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('shared_library_permissions')
        .delete()
        .eq('id', permissionId)
        .eq('shared_by', user?.id)
        .eq('library_id', libraryId);
      
      if (error) throw error;
      
      setSharedUsers(prev => prev.filter(u => u.permission_id !== permissionId));

      // If this was the last shared user, update library is_shared status
      if (sharedUsers.length <= 1) {
        const { error: updateError } = await supabase
          .from('user_libraries')
          .update({ is_shared: false })
          .eq('id', libraryId)
          .eq('created_by', user?.id);

        if (updateError) throw updateError;
      }
      
      toast({
        title: "Sharing removed",
        description: "User no longer has access to this library",
      });
    } catch (error: any) {
      toast({
        title: "Error removing access",
        description: error.message || "Failed to remove user access",
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
              <Label htmlFor="email" className="text-sm font-medium mb-1 block">Share with (email)</Label>
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
            ) : sharedUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>You haven't shared "{libraryName}" with anyone yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedUsers.map(user => (
                  <Card key={user.permission_id}>
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSharing(user.permission_id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`edit-${user.permission_id}`}
                              checked={user.can_edit}
                              onCheckedChange={(checked) => {
                                updatePermissions(user.permission_id, 'can_edit', checked);
                              }}
                            />
                            <Label htmlFor={`edit-${user.permission_id}`}>Can edit</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`delete-${user.permission_id}`}
                              checked={user.can_delete}
                              onCheckedChange={(checked) => {
                                updatePermissions(user.permission_id, 'can_delete', checked);
                              }}
                            />
                            <Label htmlFor={`delete-${user.permission_id}`}>Can delete</Label>
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