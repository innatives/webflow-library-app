export const MDN_BASE = `https://developer.mozilla.org/en-US/docs/Web/API`;

interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface ClipboardTypeData {
  type: string;
  data: string | FileInfo;
}

interface ClipboardItemData {
  kind: string;
  type: string;
  as_file: FileInfo | null;
}

interface ExtractedData {
  type: 'DataTransfer' | 'ClipboardItem';
  types?: ClipboardTypeData[];
  items?: ClipboardItemData[] | null;
  files?: FileInfo[] | null;
}

/**
 * Create a file info object from a file
 */
export const createFileInfo = (file: File | null): FileInfo | null => {
  if (!file) return null;
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    url: URL.createObjectURL(file)
  };
};

/**
 * Extract data from clipboard data
 */
export const extractData = async (data: any): Promise<ExtractedData | undefined> => {
  if (!data) {
    return undefined;
  }

  if (data instanceof DataTransfer) {
    return {
      type: 'DataTransfer',
      types: Array.from(data.types).map(type => ({
        type,
        data: data.getData(type)
      })),
      items: data.items
        ? Array.from(data.items).map(item => ({
            kind: item.kind,
            type: item.type,
            as_file: createFileInfo(item.getAsFile())
          }))
        : null,
      files: data.files ? Array.from(data.files).map(file => createFileInfo(file) as FileInfo) : null
    };
  }

  if (data instanceof ClipboardItem) {
    return {
      type: 'ClipboardItem',
      types: await Promise.all(
        Array.from(data.types).map(async type => {
          const blob = await data.getType(type);
          let content: string | FileInfo;
          
          if (blob.type.match(/^text\//)) {
            content = await blob.text();
          } else {
            content = createFileInfo(blob as unknown as File) as FileInfo;
          }
          
          return {
            type: type,
            data: content
          };
        })
      )
    };
  }
  
  return undefined;
};

/**
 * Format JSON data with proper indentation
 */
export const formatJson = (jsonString: string): string => {
  try {
    const obj = JSON.parse(jsonString);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return jsonString; // Return original if not valid JSON
  }
};

/**
 * Check if the string is valid JSON
 */
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Auto-detect and format content based on type
 */
export const formatContent = (content: string, type: string): string => {
  if (type === 'text/plain' && isValidJson(content)) {
    return formatJson(content);
  }
  
  return content;
};

/**
 * Copy content to clipboard with both application/json and text/plain formats
 * for maximum compatibility with applications like Webflow
 */
export const copyToClipboard = async (content: string, isJson: boolean = false): Promise<boolean> => {
  try {
    // For better Webflow compatibility, use the execCommand method first as it works better with some apps
    const textArea = document.createElement('textarea');
    textArea.value = content;
    
    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    // Use a custom copy event handler for JSON content
    if (isJson) {
      const copyHandler = (event: ClipboardEvent) => {
        event.preventDefault();
        event.clipboardData?.setData('application/json', content);
        event.clipboardData?.setData('text/plain', content);
      };
      
      document.addEventListener('copy', copyHandler as EventListener);
      document.execCommand('copy');
      document.removeEventListener('copy', copyHandler as EventListener);
    } else {
      // Simple plain text copy
      document.execCommand('copy');
    }
    
    document.body.removeChild(textArea);
    
    // Also try the modern API as a fallback/supplement
    if (navigator.clipboard) {
      if (isJson && navigator.clipboard.write) {
        try {
          const clipboardItem = new ClipboardItem({
            'text/plain': new Blob([content], { type: 'text/plain' }),
            'application/json': new Blob([content], { type: 'application/json' })
          });
          
          await navigator.clipboard.write([clipboardItem]);
        } catch (e) {
          console.warn('Modern clipboard API failed, but execCommand might have worked:', e);
        }
      } 
      else if (navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(content);
        } catch (e) {
          console.warn('writeText failed, but execCommand might have worked:', e);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to copy content:', error);
    // Try one more time with just the basic clipboard API
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Add this function if it doesn't already exist in the file
export const captureElementScreenshot = async (element: HTMLElement): Promise<string | null> => {
  try {
    // This function would usually use a library like html2canvas
    // For now we're just returning a placeholder
    return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/..."; 
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
};
