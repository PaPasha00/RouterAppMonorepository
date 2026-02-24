import { useRef, useCallback } from 'react';

interface UseResizableOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const useResizable = (options?: UseResizableOptions) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const resizeHandle = useRef<'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's'>('se');

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: typeof resizeHandle.current) => {
    if (!elementRef.current) return;
    
    isResizing.current = true;
    resizeHandle.current = handle;
    startPos.current = { x: e.clientX, y: e.clientY };
    
    const rect = elementRef.current.getBoundingClientRect();
    startSize.current = { width: rect.width, height: rect.height };
    
    options?.onResizeStart?.();
    e.preventDefault();
    e.stopPropagation();
  }, [options]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !elementRef.current) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    let newWidth = startSize.current.width;
    let newHeight = startSize.current.height;
    
    switch (resizeHandle.current) {
      case 'se':
        newWidth = startSize.current.width + deltaX;
        newHeight = startSize.current.height + deltaY;
        break;
      case 'sw':
        newWidth = startSize.current.width - deltaX;
        newHeight = startSize.current.height + deltaY;
        break;
      case 'ne':
        newWidth = startSize.current.width + deltaX;
        newHeight = startSize.current.height - deltaY;
        break;
      case 'nw':
        newWidth = startSize.current.width - deltaX;
        newHeight = startSize.current.height - deltaY;
        break;
      case 'e':
        newWidth = startSize.current.width + deltaX;
        break;
      case 'w':
        newWidth = startSize.current.width - deltaX;
        break;
      case 'n':
        newHeight = startSize.current.height - deltaY;
        break;
      case 's':
        newHeight = startSize.current.height + deltaY;
        break;
    }
    
    // Применяем ограничения
    const minWidth = options?.minWidth || 200;
    const minHeight = options?.minHeight || 150;
    const maxWidth = options?.maxWidth || window.innerWidth * 0.8;
    const maxHeight = options?.maxHeight || window.innerHeight * 0.8;
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    elementRef.current.style.width = `${newWidth}px`;
    elementRef.current.style.height = `${newHeight}px`;
  }, [options]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing.current) return;
    
    isResizing.current = false;
    options?.onResizeEnd?.();
  }, [options]);

  const enableResizing = useCallback(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const disableResizing = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  return {
    elementRef,
    handleMouseDown,
    enableResizing,
    disableResizing
  };
};
