import { useEffect, useState } from 'react';
import AIChatWidget from './AIChatWidget';

const MIN_WIDTH = 300;
const MAX_WIDTH = 520;

export default function TutorDrawer({ preferredGuideId = '', preferredNoteId = '' }) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const saved = Number(localStorage.getItem('cordiaTutorWidth'));
    if (saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
  }, []);

  useEffect(() => {
    const reveal = () => setOpen(true);
    window.addEventListener('cordia:tutor-prompt', reveal);
    return () => window.removeEventListener('cordia:tutor-prompt', reveal);
  }, []);

  function startResize(event) {
    event.preventDefault();
    const move = pointerEvent => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pointerEvent.clientX));
      setWidth(next);
    };
    const stop = pointerEvent => {
      move(pointerEvent);
      localStorage.setItem('cordiaTutorWidth', String(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pointerEvent.clientX))));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  return (
    <div className={`tutor-drawer-shell${open ? ' is-open' : ''}`} style={{ '--tutor-width': `${width}px` }}>
      <aside className="tutor-drawer" aria-label="Cordia Tutor" aria-hidden={!open} inert={!open}>
        <AIChatWidget preferredGuideId={preferredGuideId} preferredNoteId={preferredNoteId} />
        <div className="tutor-resize-handle" role="separator" aria-label="Resize Tutor" onPointerDown={startResize} />
      </aside>
      <button
        type="button"
        className="tutor-drawer-toggle"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-label={open ? 'Close Cordia Tutor' : 'Open Cordia Tutor'}
      >
        {open ? 'Close' : 'Tutor'}
      </button>
    </div>
  );
}
