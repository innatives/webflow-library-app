
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Library, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import LibraryManager from './LibraryManager';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface UserLibrary {
  id: string;
  name: string;
  is_shared: boolean;
  created_at: string;
}

interface LibrarySelectorProps {
  selectedLibraryId: string | null;
  onLibraryChange: (library: UserLibrary) => void;
  disabled?: boolean;
}

const LibrarySelector: React.FC<LibrarySelectorProps> = ({ 
  selectedLibraryId,
  onLibraryChange,
  disabled = false
}) => {
  const [libraries, setLibraries] = useState<UserLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLibrary, setSelectedLibrary] = useState<UserLibrary | null>(null);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLibraries();
    } else {
      setLibraries([]);
      setSelectedLibrary(null);
      setLoading(false);
    }
  }, [user]);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      if (!user) {
        setLibraries([]);
        setSelectedLibrary(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_libraries')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const librariesData = data || [];
      setLibraries(librariesData);
      
      // If there's a selectedLibraryId, find and select that library
      if (selectedLibraryId && librariesData.length > 0) {
        const selected = librariesData.find(lib => lib.id === selectedLibraryId);
        if (selected) {
          setSelectedLibrary(selected);
        } else if (librariesData.length > 0) {
          // Default to the first library if selected library not found
          setSelectedLibrary(librariesData[0]);
          onLibraryChange(librariesData[0]);
        }
      } else if (librariesData.length > 0 && !selectedLibraryId) {
        // If no library is selected but libraries exist, select the first one
        setSelectedLibrary(librariesData[0]);
        onLibraryChange(librariesData[0]);
      } else {
        setSelectedLibrary(null);
      }
    } catch (error) {
      console.error("Error fetching libraries:", error);
      setLibraries([]);
      setSelectedLibrary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLibrary = (library: UserLibrary) => {
    if (!library) return;
    setSelectedLibrary(library);
    onLibraryChange(library);
    setOpen(false);
  };

  const handleLibrarySelected = (library: UserLibrary) => {
    if (!library) return;
    setSelectedLibrary(library);
    onLibraryChange(library);
    setManageOpen(false);
    // Refresh the libraries list
    fetchLibraries();
  };

  const handleCreateLibrary = () => {
    setManageOpen(true);
  };

  if (loading) {
    return (
      <Button variant="outline" className="w-full md:w-[200px] justify-start" disabled>
        <Library className="mr-2 h-4 w-4" />
        <span className="text-sm">Loading libraries...</span>
      </Button>
    );
  }

  // When there are no libraries at all
  if (!libraries || libraries.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setManageOpen(true)}
          className="w-full md:w-[200px] justify-start"
          disabled={disabled}
        >
          <Library className="mr-2 h-4 w-4" />
          <span className="text-sm">Create library</span>
        </Button>
        
        {manageOpen && (
          <LibraryManager
            open={manageOpen}
            onClose={() => setManageOpen(false)}
            onSelect={handleLibrarySelected}
            selectedLibraryId={null}
          />
        )}
      </>
    );
  }

  // When there's only one library
  if (libraries.length === 1) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="w-full md:w-[200px] justify-between"
            disabled={disabled}
          >
            <div className="flex items-center">
              <Library className="mr-2 h-4 w-4" />
              <span className="truncate">{libraries[0]?.name || 'My Library'}</span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleCreateLibrary}
            disabled={disabled}
            className="shrink-0"
            title="Create New Library"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {manageOpen && (
          <LibraryManager
            open={manageOpen}
            onClose={() => setManageOpen(false)}
            onSelect={handleLibrarySelected}
            selectedLibraryId={selectedLibrary?.id}
          />
        )}
      </>
    );
  }

  // When there are multiple libraries
  return (
    <>
      <div className="flex items-center gap-2">
        <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full md:w-[200px] justify-between"
              disabled={disabled}
            >
              <div className="flex items-center">
                <Library className="mr-2 h-4 w-4" />
                <span className="truncate">{selectedLibrary?.name || 'Select library'}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full md:w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search libraries..." />
              <CommandList>
                <CommandEmpty>No library found.</CommandEmpty>
                <CommandGroup>
                  {libraries.map((library) => (
                    <CommandItem
                      key={library.id}
                      onSelect={() => handleSelectLibrary(library)}
                      className="cursor-pointer"
                    >
                      <Library className="mr-2 h-4 w-4" />
                      <span className="truncate">{library.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setManageOpen(true);
                    }}
                    className="border-t mt-1 pt-1 cursor-pointer"
                  >
                    <span className="text-muted-foreground text-xs">Manage libraries</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleCreateLibrary}
          disabled={disabled}
          className="shrink-0"
          title="Create New Library"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {manageOpen && (
        <LibraryManager
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          onSelect={handleLibrarySelected}
          selectedLibraryId={selectedLibrary?.id}
        />
      )}
    </>
  );
};

export default LibrarySelector;
