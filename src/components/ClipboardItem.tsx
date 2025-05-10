import React, { useState } from 'react';
import { Copy, Check, Clipboard, ClipboardCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { formatContent, copyToClipboard, isValidJson } from '@/utils/clipboardUtils';
import ClassReplacer from './ClassReplacer';
import SaveClipboardItem from './SaveClipboardItem';

interface FileInfoProps {
  file: {
    name: string;
    size: number;
    type: string;
    url: string;
  } | null;
}

const FileInfo: React.FC<FileInfoProps> = ({ file }) => {
  if (!file) return <em className="text-muted-foreground">N/A</em>;

  return (
    <div className="border rounded-md p-4">
      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div>
          <span className="font-semibold block">Name:</span>
          <code className="bg-muted px-1 py-0.5 rounded">{file.name}</code>
        </div>
        <div>
          <span className="font-semibold block">Size:</span>
          <code className="bg-muted px-1 py-0.5 rounded">{file.size} bytes</code>
        </div>
        <div>
          <span className="font-semibold block">Type:</span>
          <code className="bg-muted px-1 py-0.5 rounded">{file.type}</code>
        </div>
      </div>
      {file.type.startsWith('image/') && (
        <div className="mt-2 border rounded p-2 bg-background/50">
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <img 
              src={file.url} 
              alt={file.name} 
              className="max-h-48 max-w-full object-contain mx-auto"
            />
          </a>
        </div>
      )}
    </div>
  );
};

interface ClipboardTypeProps {
  type: string;
  data: string | any; // Could be string or file info object
  onCopy?: () => void;
  onDelete?: () => void;
}

const ClipboardType: React.FC<ClipboardTypeProps> = ({ type, data, onCopy, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [content, setContent] = useState<string>(typeof data === 'string' ? data : '');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const copyToClipboardHandler = async () => {
    if (typeof content !== 'string') {
      toast({
        title: "Cannot copy file data",
        description: "Only text content can be copied",
        variant: "destructive"
      });
      return;
    }

    // Always treat as JSON for Webflow when it's either:
    // 1. Explicitly JSON type
    // 2. Plain text that is valid JSON
    const isJson = type.includes('json') || 
                  (type === 'text/plain' && isValidJson(content));
    
    const success = await copyToClipboard(content, isJson);

    if (success) {
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: isJson ? 
          "Content has been copied in a format compatible with Webflow" : 
          "Content has been copied as plain text",
      });
      
      setTimeout(() => setCopied(false), 2000);
      if (onCopy) onCopy();
    } else {
      toast({
        title: "Copy failed",
        description: "Please try again or copy manually",
        variant: "destructive"
      });
    }
  };

  const handleReplaceContent = (newContent: string) => {
    // Update the local state with the replaced content
    setContent(newContent);
  };

  const renderContent = () => {
    if (typeof content !== 'string') {
      return <FileInfo file={content} />;
    }

    const formattedContent = formatContent(content, type);
    const isJson = type === 'application/json' || (type === 'text/plain' && formattedContent !== content);

    return (
      <pre className={`code-block bg-muted ${content.length > 500 ? 'max-h-72 overflow-y-auto' : ''}`}>
        <code className="code-wrap">{formattedContent || <em>Empty string</em>}</code>
      </pre>
    );
  };

  // Only show class replacer for content that could be JSON and contain class names
  const showClassReplacer = typeof content === 'string' && (
    type.includes('json') || (type === 'text/plain' && isValidJson(content))
  );

  // Only allow saving text content
  const canBeSaved = typeof content === 'string' && content.trim().length > 0;

  return (
    <div className="border rounded-md mb-2">
      <div className="bg-muted p-2 flex justify-between items-center">
        <Badge variant="outline" className="font-mono">
          {type}
        </Badge>
        <div className="flex gap-2">
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
              <span className="sr-md:inline hidden">Delete</span>
            </Button>
          )}
          
          {canBeSaved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="h-8 gap-1"
            >
              {showSaveForm ? "Cancel" : "Save to Library"}
            </Button>
          )}
          
          {typeof content === 'string' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboardHandler}
              className="h-8 gap-1"
            >
              {copied ? (
                <>
                  <Check size={14} /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy content
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {showClassReplacer && (
        <div className="px-2 pt-2">
          <ClassReplacer content={content} onReplace={handleReplaceContent} />
        </div>
      )}
      
      <div className="p-2">{renderContent()}</div>
      
      {showSaveForm && canBeSaved && (
        <div className="px-4 pb-3">
          <SaveClipboardItem 
            content={content} 
            contentType={type}
            onSave={() => setShowSaveForm(false)}
          />
        </div>
      )}
    </div>
  );
};

interface ClipboardItemProps {
  data: any;
  index: number;
  onDelete?: (index: number) => void;
}

const ClipboardItem: React.FC<ClipboardItemProps> = ({ data, index, onDelete }) => {
  const hasTypes = data.types && data.types.length > 0;
  const hasItems = data.items && data.items.length > 0;
  const hasFiles = data.files && data.files.length > 0;
  const [activeTab, setActiveTab] = useState<string>(
    hasTypes ? "types" : hasItems ? "items" : "files"
  );
  const [copiedSections, setCopiedSections] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  // Find the first valid text content for copying
  const findCopyableContent = () => {
    if (hasTypes) {
      // Try to find text content in types
      const textType = data.types.find((item: any) => typeof item.data === 'string');
      if (textType) {
        return { data: textType.data, type: textType.type };
      }
    }
    return null;
  };

  const handleCopySection = (sectionId: string) => {
    setCopiedSections(prev => ({ ...prev, [sectionId]: true }));
    
    // Reset copied status after 2 seconds
    setTimeout(() => {
      setCopiedSections(prev => ({ ...prev, [sectionId]: false }));
    }, 2000);
  };

  const handleDeleteItem = () => {
    if (onDelete) {
      onDelete(index);
    }
  };

  return (
    <Card className="mb-6 shadow-md animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>
            {data.type}{' '}
            <Badge variant="outline" className="ml-2 font-normal text-xs">
              #{index + 1}
            </Badge>
          </span>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteItem}
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {hasTypes && <TabsTrigger value="types">Types ({data.types.length})</TabsTrigger>}
            {hasItems && <TabsTrigger value="items">Items ({data.items.length})</TabsTrigger>}
            {hasFiles && <TabsTrigger value="files">Files ({data.files.length})</TabsTrigger>}
          </TabsList>
          
          {hasTypes && (
            <TabsContent value="types" className="mt-0">
              <div className="space-y-4">
                {data.types.map((item: ClipboardTypeProps, i: number) => (
                  <ClipboardType 
                    key={i} 
                    type={item.type} 
                    data={item.data} 
                    onCopy={() => handleCopySection(`types-${i}`)}
                    onDelete={onDelete ? () => handleDeleteItem() : undefined}
                  />
                ))}
              </div>
            </TabsContent>
          )}
          
          {hasItems && (
            <TabsContent value="items" className="mt-0">
              <div className="space-y-4">
                {data.items.map((item: any, i: number) => (
                  <div key={i} className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 mb-2">
                        <div>
                          <span className="font-semibold text-sm">Kind:</span>
                          <code className="bg-muted px-1 py-0.5 rounded ml-2">{item.kind}</code>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Type:</span>
                          <code className="bg-muted px-1 py-0.5 rounded ml-2">{item.type}</code>
                        </div>
                      </div>
                      {item.kind === 'string' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (item.as_file) return; // Skip files
                            const success = await copyToClipboard(item.string || '', 
                              item.type.includes('json') || (item.type === 'text/plain' && item.string && isValidJson(item.string))
                            );
                            if (success) {
                              handleCopySection(`items-${i}`);
                              toast({
                                title: "Copied to clipboard",
                                description: "Item content has been copied",
                              });
                            }
                          }}
                          className="gap-1"
                        >
                          {copiedSections[`items-${i}`] ? (
                            <><Check size={14} /> Copied</>
                          ) : (
                            <><Copy size={14} /> Copy</>
                          )}
                        </Button>
                      )}
                    </div>
                    {item.as_file && (
                      <div>
                        <Separator className="my-2" />
                        <div className="font-semibold text-sm mb-1">File:</div>
                        <FileInfo file={item.as_file} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
          
          {hasFiles && (
            <TabsContent value="files" className="mt-0">
              <div className="space-y-4">
                {data.files.map((file: any, i: number) => (
                  <div key={i}>
                    <div className="font-semibold text-sm mb-1">File {i + 1}:</div>
                    <FileInfo file={file} />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClipboardItem;
