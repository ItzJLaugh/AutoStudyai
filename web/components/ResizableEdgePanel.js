import { useEffect, useRef, useState } from 'react';

const MIN_HEIGHT = 180;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function ResizableEdgePanel({
  as: Element = 'div',
  edge = 'left',
  className = '',
  storageKey,
  defaultWidth = 280,
  minWidth = 220,
  children,
  ...props
}) {
  const panelRef = useRef(null);
  const [size, setSize] = useState({ width: defaultWidth, height: null });

  function limits() {
    if (typeof window === 'undefined') return { maxWidth: defaultWidth, maxHeight: 800 };
    return {
      maxWidth: Math.max(minWidth, Math.floor(window.innerWidth * 0.30)),
      maxHeight: Math.max(MIN_HEIGHT, window.innerHeight - 112),
    };
  }

  function save(next) {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  useEffect(() => {
    const { maxWidth, maxHeight } = limits();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      setSize({
        width: clamp(Number(saved.width) || defaultWidth, minWidth, maxWidth),
        height: saved.height ? clamp(Number(saved.height), MIN_HEIGHT, maxHeight) : null,
      });
    } catch {
      setSize({ width: clamp(defaultWidth, minWidth, maxWidth), height: null });
    }

    const keepInBounds = () => {
      const nextLimits = limits();
      setSize(current => ({
        width: clamp(current.width, minWidth, nextLimits.maxWidth),
        height: current.height ? clamp(current.height, MIN_HEIGHT, nextLimits.maxHeight) : null,
      }));
    };
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [defaultWidth, minWidth, storageKey]);

  function startResize(direction, event) {
    if (window.innerWidth <= 980 || !panelRef.current) return;
    event.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const cursor = direction === 'left' || direction === 'right' ? 'ew-resize' : 'ns-resize';
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    const move = pointerEvent => {
      const dx = pointerEvent.clientX - startX;
      const dy = pointerEvent.clientY - startY;
      const { maxWidth, maxHeight } = limits();
      setSize(current => ({
        width: direction === 'left'
          ? clamp(startWidth - dx, minWidth, maxWidth)
          : direction === 'right'
            ? clamp(startWidth + dx, minWidth, maxWidth)
            : current.width,
        height: direction === 'top'
          ? clamp(startHeight - dy, MIN_HEIGHT, maxHeight)
          : direction === 'bottom'
            ? clamp(startHeight + dy, MIN_HEIGHT, maxHeight)
            : current.height,
      }));
    };

    const stop = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      setSize(current => {
        save(current);
        return current;
      });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  function resizeWithKeyboard(direction, event) {
    const delta = event.shiftKey ? 40 : 10;
    const { maxWidth, maxHeight } = limits();
    const horizontal = direction === 'left' || direction === 'right';
    const validKey = horizontal
      ? event.key === 'ArrowLeft' || event.key === 'ArrowRight'
      : event.key === 'ArrowUp' || event.key === 'ArrowDown';
    if (!validKey) return;
    setSize(current => {
      let next = current;
      if (direction === 'left' && event.key === 'ArrowLeft') next = { ...current, width: clamp(current.width + delta, minWidth, maxWidth) };
      else if (direction === 'left' && event.key === 'ArrowRight') next = { ...current, width: clamp(current.width - delta, minWidth, maxWidth) };
      else if (direction === 'right' && event.key === 'ArrowLeft') next = { ...current, width: clamp(current.width - delta, minWidth, maxWidth) };
      else if (direction === 'right' && event.key === 'ArrowRight') next = { ...current, width: clamp(current.width + delta, minWidth, maxWidth) };
      else if (direction === 'top' && event.key === 'ArrowUp') next = { ...current, height: clamp((current.height || panelRef.current?.offsetHeight || MIN_HEIGHT) + delta, MIN_HEIGHT, maxHeight) };
      else if (direction === 'top' && event.key === 'ArrowDown') next = { ...current, height: clamp((current.height || panelRef.current?.offsetHeight || MIN_HEIGHT) - delta, MIN_HEIGHT, maxHeight) };
      else if (direction === 'bottom' && event.key === 'ArrowUp') next = { ...current, height: clamp((current.height || panelRef.current?.offsetHeight || MIN_HEIGHT) - delta, MIN_HEIGHT, maxHeight) };
      else if (direction === 'bottom' && event.key === 'ArrowDown') next = { ...current, height: clamp((current.height || panelRef.current?.offsetHeight || MIN_HEIGHT) + delta, MIN_HEIGHT, maxHeight) };
      save(next);
      return next;
    });
    event.preventDefault();
  }

  const { maxWidth, maxHeight } = limits();
  const panelStyle = {
    ...props.style,
    width: `${clamp(size.width, minWidth, maxWidth)}px`,
    maxWidth: '30vw',
    height: size.height ? `${clamp(size.height, MIN_HEIGHT, maxHeight)}px` : undefined,
  };

  return (
    <Element
      {...props}
      ref={panelRef}
      className={`resizable-edge-panel resizable-edge-panel-${edge} ${className}`.trim()}
      data-height-resized={size.height ? 'true' : undefined}
      style={panelStyle}
    >
      {children}
      {['top', 'right', 'bottom', 'left'].map(direction => (
        <span
          key={direction}
          className={`edge-resize-handle edge-resize-handle-${direction}`}
          role="separator"
          aria-label={`Resize ${props['aria-label'] || 'panel'} from the ${direction}`}
          aria-orientation={direction === 'left' || direction === 'right' ? 'vertical' : 'horizontal'}
          tabIndex="0"
          onPointerDown={event => startResize(direction, event)}
          onKeyDown={event => resizeWithKeyboard(direction, event)}
        />
      ))}
    </Element>
  );
}
