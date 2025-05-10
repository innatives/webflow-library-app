
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isValidJson } from '@/utils/clipboardUtils';

interface ClassReplacerProps {
  content: string;
  onReplace: (newContent: string) => void;
}

const ClassReplacer: React.FC<ClassReplacerProps> = ({ content, onReplace }) => {
  const [sourceClass, setSourceClass] = useState<string>('');
  const [targetClass, setTargetClass] = useState<string>('');
  const [hasDetectedClass, setHasDetectedClass] = useState<boolean>(false);
  const { toast } = useToast();

  // Analyze content to detect possible class prefixes
  useEffect(() => {
    if (!content || !isValidJson(content)) return;

    try {
      // Look for patterns like "name":"test_class" in JSON
      const classNameRegex = /"name"\s*:\s*"([a-zA-Z0-9_-]+)_/g;
      const matches = Array.from(content.matchAll(classNameRegex));
      
      if (matches.length > 0) {
        // Get unique prefixes
        const uniquePrefixes = Array.from(
          new Set(matches.map(match => match[1] + '_'))
        );
        
        if (uniquePrefixes.length > 0) {
          setSourceClass(uniquePrefixes[0]);
          setHasDetectedClass(true);
          toast({
            title: "Class prefix detected",
            description: `Found '${uniquePrefixes[0]}' in content. You can now replace it.`,
          });
        }
      }
    } catch (error) {
      console.error("Error detecting classes:", error);
    }
  }, [content, toast]);

  const handleReplace = () => {
    if (!sourceClass || !targetClass) {
      toast({
        title: "Missing input",
        description: "Please provide both source and target class prefixes",
        variant: "destructive",
      });
      return;
    }

    try {
      // Replace all occurrences of the class prefix in the content
      const regex = new RegExp(sourceClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newContent = content.replace(regex, targetClass);
      
      // Make sure the replaced content is properly updated for both display and copy
      // This is critical - we need to pass the new content up to the parent component
      onReplace(newContent);
      
      toast({
        title: "Classes replaced",
        description: `Replaced '${sourceClass}' with '${targetClass}' in content`,
      });
    } catch (error) {
      toast({
        title: "Error replacing classes",
        description: "Failed to replace class names",
        variant: "destructive",
      });
      console.error("Error replacing classes:", error);
    }
  };

  if (!isValidJson(content)) return null;

  return (
    <div className="bg-muted/30 rounded-md p-3 mb-4 border border-border">
      <h4 className="text-sm font-medium mb-2">Replace Class Prefix</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label htmlFor="sourceClass" className="text-xs text-muted-foreground block mb-1">Source prefix:</label>
          <Input
            id="sourceClass"
            placeholder="e.g. test_"
            value={sourceClass}
            onChange={(e) => setSourceClass(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label htmlFor="targetClass" className="text-xs text-muted-foreground block mb-1">Target prefix:</label>
          <Input
            id="targetClass"
            placeholder="e.g. prod_"
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-end">
          <Button 
            onClick={handleReplace} 
            className="h-8 gap-1 w-full"
            variant="secondary"
            disabled={!sourceClass || !targetClass}
          >
            <Wand2 size={14} />
            Replace
          </Button>
        </div>
      </div>
      {hasDetectedClass && (
        <p className="text-xs text-muted-foreground mt-2">
          Detected class prefix: <code className="bg-muted px-1 py-0.5 rounded">{sourceClass}</code>
        </p>
      )}
    </div>
  );
};

export default ClassReplacer;
