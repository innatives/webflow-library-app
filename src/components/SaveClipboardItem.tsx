import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Share, Loader2, Image, Upload } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LibrarySelector from './LibrarySelector';

interface UserLibrary {
  id: string;
  name: string;
  is_shared: boolean;
  created_at: string;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters')
});

interface SaveClipboardItemProps {
  content: string;
  contentType: string;
  onSave?: () => void;
}

const SaveClipboardItem: React.FC<SaveClipboardItemProps> = ({ content, contentType, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<UserLibrary | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: ''
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImageUploading(true);
    
    // Read the selected file as a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
      setImageUploading(false);
      
      toast({
        title: 'Image added',
        description: 'Your custom image has been attached to the item',
      });
    };
    
    reader.onerror = () => {
      setImageUploading(false);
      toast({
        title: 'Image upload failed',
        description: 'Unable to read the selected image',
        variant: 'destructive'
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleLibraryChange = (library: UserLibrary) => {
    setSelectedLibrary(library);
  };

  const saveToSupabase = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to save items to your library.',
        variant: 'destructive'
      });
      
      navigate('/auth');
      return;
    }
    
    if (!selectedLibrary) {
      toast({
        title: 'No library selected',
        description: 'Please select a library to save this item to.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('shared_clipboard_items')
        .insert({
          title: values.title,
          content: content,
          content_type: contentType,
          created_by: user.id,
          screenshot_url: imageData,
          library_id: selectedLibrary.id
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Item saved',
        description: `Your clipboard item has been saved to "${selectedLibrary.name}".`,
      });
      
      form.reset();
      setImageData(null);
      if (onSave) onSave();
    } catch (error: any) {
      let errorMessage = 'An error occurred while saving the item.';
      
      if (error.message?.includes('row-level security policy')) {
        errorMessage = 'Authentication required. Please sign in to save items.';
        setTimeout(() => navigate('/auth'), 1500);
      }
      
      toast({
        title: 'Error saving item',
        description: errorMessage,
        variant: 'destructive'
      });
      console.error('Error saving to Supabase:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(saveToSupabase)} className="space-y-3 border-t pt-3 mt-2">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter a title for this clipboard item" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                This title will help you identify the item later
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FormLabel>Library</FormLabel>
            <LibrarySelector
              selectedLibraryId={selectedLibrary?.id || null}
              onLibraryChange={handleLibraryChange}
              disabled={isSaving}
            />
            <p className="text-sm text-muted-foreground">
              Select which library to save this item to
            </p>
          </div>
        </div>
        
        <div className="border rounded-md p-4">
          <div className="mb-3 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Add a custom image to help identify this item</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleBrowseClick}
              disabled={imageUploading}
              className="gap-1"
            >
              {imageUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Browse Files
                </>
              )}
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          
          <div className="bg-muted/50 rounded-md p-2 border min-h-[100px] flex items-center justify-center">
            {imageData ? (
              <img 
                src={imageData} 
                alt="Selected image" 
                className="max-h-32 w-auto object-contain rounded-sm shadow-sm" 
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Image className="h-8 w-8 mb-2" />
                <span className="text-sm">Selected image will appear here</span>
              </div>
            )}
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={isSaving || !selectedLibrary} 
          className="w-full gap-2"
          variant="default"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Share className="h-4 w-4" />
              {user ? 'Save to Library' : 'Sign in to Save'}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SaveClipboardItem;