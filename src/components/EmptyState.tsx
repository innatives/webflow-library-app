import React, { useCallback } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  onPaste: () => void;
  hasAsyncClipboard: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onPaste,
  hasAsyncClipboard
}) => {
  const autoselect = useCallback((e: React.FocusEvent<HTMLSpanElement>) => {
    const range = document.createRange();
    range.selectNodeContents(e.target);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  return (
    <Card className="w-full border-0 bg-secondary/50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center text-center gap-6">
          <ClipboardPaste size={32} className="text-muted-foreground" />
          
          <div>
            <h2 className="font-medium mb-4 text-xl">To get started, either:</h2>
            
            <ul className="space-y-4 text-left">
              <li className="flex items-center gap-2">
                <div className="rounded-full p-2 flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground font-medium">1</span>
                </div>
                <div>
                  <Button variant="outline" disabled={hasAsyncClipboard} onClick={onPaste} className="mr-2 h-8" size="sm">
                    <ClipboardPaste size={14} className="mr-2" />
                    Paste using the Clipboard API
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    (if your browser supports the Asynchronous Clipboard API)
                  </span>
                </div>
              </li>
              
              <li className="flex items-center gap-2">
                <div className="rounded-full p-2 flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground font-medium">2</span>
                </div>
                <div>
                  Paste with <kbd className="px-2 py-1 rounded text-xs bg-muted">Ctrl+V</kbd> / <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘V</kbd> keyboard shortcut or{" "}
                  <span contentEditable onFocus={autoselect} className="px-3 py-1 border rounded cursor-text inline-block min-w-20 text-center" role="textbox" aria-label="Paste area" suppressContentEditableWarning={true}></span>
                </div>
              </li>
              
              <li className="flex items-center gap-2">
                <div className="rounded-full p-2 flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground font-medium">3</span>
                </div>
                <div>
                  Drop a file or content on the page
                </div>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyState;