import React, { useState, useEffect, useCallback } from 'react';
import { extractData, formatContent } from '@/utils/clipboardUtils';
import ClipboardItem from './ClipboardItem';
import EmptyState from './EmptyState';
import { Button } from '@/components/ui/button';
import { Trash2, ClipboardList } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';

const ClipboardParser: React.FC = () => {
  const [clipboardHistory, setClipboardHistory] = useState<any[]>([]);
  const [label, setLabel] = useState<string>('');
  const { toast } = useToast();
  const hasAsyncClipboard = !navigator.clipboard || !navigator.clipboard.read;

  const addToHistory = useCallback((data: any, source: string) => {
    if (data) {
      const entry = {
        data,
        source,
        timestamp: new Date().getTime()
      };
      setClipboardHistory(prev => [entry, ...prev]);
      setLabel(source);
      toast({
        title: "Clipboard content parsed",
        description: `Successfully parsed ${source} content`
      });
    }
  }, [toast]);

  const handleAsyncPaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const extractedData = await Promise.all(clipboardItems.map(extractData));
      const validData = extractedData.filter(Boolean) as any[];
      if (validData.length > 0) {
        validData.forEach(data => {
          addToHistory(data, 'ClipboardItems');
        });
      } else {
        toast({
          variant: "destructive",
          title: "No valid clipboard data",
          description: "Could not extract data from clipboard"
        });
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      toast({
        variant: "destructive",
        title: "Failed to read clipboard",
        description: "Make sure you've granted clipboard permission"
      });
    }
  }, [toast, addToHistory]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    try {
      const data = await extractData(e.clipboardData);
      if (data) {
        addToHistory(data, 'clipboardData');
      }
    } catch (error) {
      console.error("Failed to process pasted data:", error);
      toast({
        variant: "destructive",
        title: "Failed to process paste",
        description: "An error occurred while parsing the clipboard data"
      });
    }
  }, [toast, addToHistory]);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    try {
      const data = await extractData(e.dataTransfer);
      if (data) {
        addToHistory(data, 'dataTransfer');
      }
    } catch (error) {
      console.error("Failed to process dropped data:", error);
      toast({
        variant: "destructive",
        title: "Failed to process drop",
        description: "An error occurred while parsing the dropped data"
      });
    }
  }, [toast, addToHistory]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const clearHistory = useCallback(() => {
    setClipboardHistory([]);
    setLabel('');
    toast({
      title: "Cleared",
      description: "Clipboard history has been cleared"
    });
  }, [toast]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste as EventListener);
    document.addEventListener('drop', handleDrop as EventListener);
    document.addEventListener('dragover', handleDragOver as EventListener);
    return () => {
      document.removeEventListener('paste', handlePaste as EventListener);
      document.removeEventListener('drop', handleDrop as EventListener);
      document.removeEventListener('dragover', handleDragOver as EventListener);
    };
  }, [handlePaste, handleDrop, handleDragOver]);

  return (
    <Card className="w-full border-0">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-medium">Clipboard Parser</h2>
          </div>
          {clipboardHistory.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-1 h-8">
              <Trash2 size={14} />
              Clear
            </Button>
          )}
        </div>

        {clipboardHistory.length === 0 ? (
          <EmptyState onPaste={handleAsyncPaste} hasAsyncClipboard={hasAsyncClipboard} />
        ) : (
          <div className="space-y-2">
            {clipboardHistory.map((item, index) => (
              <ClipboardItem key={item.timestamp} data={item.data} index={index} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClipboardParser;