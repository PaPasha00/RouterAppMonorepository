import { useRef, useCallback } from 'react';

interface UseDraggableOptions {
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const useDraggable = (options?: UseDraggableOptions) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!elementRef.current) return;
    
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    
    const rect = elementRef.current.getBoundingClientRect();
    initialPos.current = { x: rect.left, y: rect.top };
    
    options?.onDragStart?.();
    
    e.preventDefault();
  }, [options]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !elementRef.current) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    const newX = initialPos.current.x + deltaX;
    const newY = initialPos.current.y + deltaY;
    
    elementRef.current.style.left = `${newX}px`;
    elementRef.current.style.top = `${newY}px`;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    options?.onDragEnd?.();
  }, [options]);

  const enableDragging = useCallback(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const disableDragging = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  return {
    elementRef,
    handleMouseDown,
    enableDragging,
    disableDragging
  };
};
