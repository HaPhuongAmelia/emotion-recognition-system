/* eslint-disable @typescript-eslint/no-explicit-any */
import { type RefObject, useEffect } from 'react';

/**
 * Enable click-and-drag horizontal scrolling on a scrollable element.
 * Attach to a container with overflow-x: auto and wide content.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const base = ref.current as HTMLElement | null;
    if (!base) return;

    // AntD Table scroll container candidates
    const target: HTMLElement = (base.querySelector?.('.ant-table-body') as HTMLElement)
      || (base.querySelector?.('.ant-table-content') as HTMLElement)
      || base;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // only left click
      isDown = true;
      startX = e.clientX;
      startScrollLeft = target.scrollLeft;
      target.style.cursor = 'grabbing';
      (target.style as any).userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      target.scrollLeft = startScrollLeft - dx;
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      target.style.cursor = 'grab';
      (target.style as any).userSelect = '';
    };

    const onDragStart = (e: Event) => {
      if (isDown) e.preventDefault();
    };

    // Initialize cursor
    target.style.cursor = 'grab';

    target.addEventListener('mousedown', onMouseDown, { passive: true });
    // Use window mousemove so dragging over children still works
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    target.addEventListener('mouseleave', onMouseUp, { passive: true });
    target.addEventListener('dragstart', onDragStart as EventListener, { passive: false });

    return () => {
      target.removeEventListener('mousedown', onMouseDown as EventListener);
      window.removeEventListener('mousemove', onMouseMove as EventListener);
      window.removeEventListener('mouseup', onMouseUp as EventListener);
      target.removeEventListener('mouseleave', onMouseUp as EventListener);
      target.removeEventListener('dragstart', onDragStart as EventListener);
    };
  }, [ref]);
}
