import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Check, Loader2, Image, Code, Wand2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { copyToClipboard, formatContent, isValidJson } from '@/utils/clipboardUtils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ClassReplacer from './ClassReplacer';

interface SharedItemProps {
  item: {
    id: string;
    title: string;
    content: string;
    content_type: string;
    created_at: string;
    created_by: string | null;
    screenshot_url?: string | null;
    library_id?: string | null;
  };
  onDelete: (id: string) => Promise<void>;
}

const SharedClipboardItem: React.FC<SharedItemProps> = ({
  item,
  onDelete
}) => {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [content, setContent] = useState(item.content);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    // Initialize content from item
    setContent(item.content);
  }, [item.content]);
  
  useEffect(() => {
    // Check permissions if we're looking at someone else's item
    if (user && item.created_by && item.created_by !== user.id) {
      checkPermissions();
      setIsShared(true);
    } else if (user && item.created_by === user.id) {
      // User owns this item, they can delete it
      setCanDelete(true);
      setIsShared(false);
    }
  }, [user, item]);

  const checkPermissions = async () => {
    if (!user || !item.created_by || !item.library_id) return;
    try {
      const { data, error } = await supabase
        .from('shared_library_permissions')
        .select('can_delete')
        .eq('shared_by', item.created_by)
        .eq('shared_with', user.id)
        .eq('library_id', item.library_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCanDelete(data.can_delete);
      } else {
        setCanDelete(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Default to no permissions if there's an error
      setCanDelete(false);
    }
  };

  const handleCopy = async () => {
    const isJson = item.content_type.includes('json') || item.content_type === 'text/plain' && isValidJson(content);
    const success = await copyToClipboard(content, isJson);
    if (success) {
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `"${item.title}" has been copied to your clipboard`
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Copy failed",
        description: "Please try again or copy manually",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleReplace = (newContent: string) => {
    setContent(newContent);
  };

  // Check if the content could be JSON for class replacement
  const showClassReplacer = item.content_type.includes('json') || 
                          (item.content_type === 'text/plain' && isValidJson(content));

  return <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate">{item.title}</span>
            {isShared && <Badge variant="outline" className="ml-2 text-xs">Shared</Badge>}
          </div>
          <div className="flex gap-2 ml-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 gap-1">
              {copied ? <>
                  <Check size={14} />
                  <span className="sr-md:inline hidden">Copied</span>
                </> : <>
                  <Copy size={14} />
                  <span className="sr-md:inline hidden">Copy</span>
                </>}
            </Button>
            
            {canDelete && <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <>
                    <Trash2 size={14} />
                    <span className="sr-md:inline hidden">Delete</span>
                  </>}
              </Button>}
          </div>
        </CardTitle>
      </CardHeader>

      {item.screenshot_url && <div className="flex justify-end items-center px-4 py-2">
          <div className="flex items-center space-x-2">
            <Label htmlFor={`toggle-view-${item.id}`} className="text-xs">
              {showCode ? <Code size={14} /> : <Image size={14} />}
            </Label>
            <Switch id={`toggle-view-${item.id}`} checked={showCode} onCheckedChange={setShowCode} className="bg-neutral-300 hover:bg-neutral-200" />
          </div>
        </div>}

      {showClassReplacer && (
        <div className="px-4 pt-2">
          <ClassReplacer content={content} onReplace={handleReplace} />
        </div>
      )}

      <Separator />
      
      {item.screenshot_url && !showCode ? <div className="p-4">
          <div className="bg-muted/50 rounded-md p-2 border">
            <img src={item.screenshot_url} alt="Screenshot" className="w-full h-auto object-contain rounded-sm shadow-sm" />
          </div>
        </div> : <CardContent className="p-2">
          <div className="bg-muted rounded p-2 max-h-40 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {formatContent(content, item.content_type)}
            </pre>
          </div>
        </CardContent>}
    </Card>;
};
export default SharedClipboardItem;