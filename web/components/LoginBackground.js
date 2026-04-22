import { useEffect, useRef } from 'react';

const EMOJIS = ['📚', '🎓', '✏️', '📝', '🔬', '💡', '📖', '🖊️', '📐', '🔭', '⚗️', '🧮', '📊', '🔍'];
const COUNT = 13;
const BASE_SPEED = 0.32;
const CURSOR_RADIUS = 65;

export default function LoginBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let grabbed = null; // { idx, offX, offY }
    const cursor = { x: -999, y: -999 };
    const cursorHistory = [];

    function setSize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    setSize();
    window.addEventListener('resize', setSize);

    const icons = Array.from({ length: COUNT }, (_, i) => {
      let vx = (Math.random() - 0.5) * BASE_SPEED * 2;
      let vy = (Math.random() - 0.5) * BASE_SPEED * 2;
      if (Math.abs(vx) < 0.08) vx = BASE_SPEED * (Math.random() > 0.5 ? 1 : -1);
      if (Math.abs(vy) < 0.08) vy = BASE_SPEED * (Math.random() > 0.5 ? 1 : -1);
      return {
        emoji: EMOJIS[i % EMOJIS.length],
        x: 80 + Math.random() * (window.innerWidth - 160),
        y: 80 + Math.random() * (window.innerHeight - 160),
        vx, vy,
        size: 30 + Math.floor(Math.random() * 22),
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.007,
        opacity: 0.3 + Math.random() * 0.28,
      };
    });

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      icons.forEach((ic, i) => {
        if (grabbed && grabbed.idx === i) {
          ic.x = cursor.x - grabbed.offX;
          ic.y = cursor.y - grabbed.offY;
          ic.angle += ic.spin * 2;
        } else {
          // Cursor repulsion
          const dx = ic.x - cursor.x;
          const dy = ic.y - cursor.y;
          const d = Math.hypot(dx, dy);
          if (d < CURSOR_RADIUS && d > 0) {
            const f = ((CURSOR_RADIUS - d) / CURSOR_RADIUS) * 1.4;
            ic.vx += (dx / d) * f;
            ic.vy += (dy / d) * f;
          }

          ic.x += ic.vx;
          ic.y += ic.vy;
          ic.angle += ic.spin;

          // Speed damping / floor
          const spd = Math.hypot(ic.vx, ic.vy);
          if (spd > 4) {
            ic.vx *= 0.92;
            ic.vy *= 0.92;
          } else if (spd > BASE_SPEED) {
            ic.vx *= 0.985;
            ic.vy *= 0.985;
          } else if (spd < BASE_SPEED * 0.55 && spd > 0) {
            const s = (BASE_SPEED * 0.55) / spd;
            ic.vx *= s;
            ic.vy *= s;
          } else if (spd === 0) {
            ic.vx = BASE_SPEED;
            ic.vy = BASE_SPEED;
          }

          // Wall bounce
          const pad = ic.size;
          if (ic.x < pad)                    { ic.x = pad; ic.vx = Math.abs(ic.vx) || BASE_SPEED; }
          if (ic.x > canvas.width - pad)     { ic.x = canvas.width - pad; ic.vx = -(Math.abs(ic.vx) || BASE_SPEED); }
          if (ic.y < pad)                    { ic.y = pad; ic.vy = Math.abs(ic.vy) || BASE_SPEED; }
          if (ic.y > canvas.height - pad)    { ic.y = canvas.height - pad; ic.vy = -(Math.abs(ic.vy) || BASE_SPEED); }
        }

        ctx.save();
        ctx.translate(ic.x, ic.y);
        ctx.rotate(ic.angle);
        ctx.globalAlpha = ic.opacity;
        ctx.font = `${ic.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ic.emoji, 0, 0);
        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    }
    loop();

    function onMouseMove(e) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursorHistory.push({ x: e.clientX, y: e.clientY, t: Date.now() });
      if (cursorHistory.length > 6) cursorHistory.shift();
    }

    function onMouseDown(e) {
      // Don't grab when clicking form elements
      if (e.target.closest('input, button, a, select, textarea, label')) return;
      const x = e.clientX, y = e.clientY;
      for (let i = 0; i < icons.length; i++) {
        const ic = icons[i];
        if (Math.hypot(ic.x - x, ic.y - y) < ic.size + 8) {
          grabbed = { idx: i, offX: x - ic.x, offY: y - ic.y };
          document.body.style.cursor = 'grabbing';
          break;
        }
      }
    }

    function onMouseUp() {
      if (grabbed !== null) {
        const ic = icons[grabbed.idx];
        if (cursorHistory.length >= 2) {
          const last = cursorHistory[cursorHistory.length - 1];
          const prev = cursorHistory[Math.max(0, cursorHistory.length - 4)];
          const dt = Math.max(1, (last.t - prev.t) / 16);
          ic.vx = ((last.x - prev.x) / dt) * 0.35;
          ic.vy = ((last.y - prev.y) / dt) * 0.35;
          // Cap throw speed
          const spd = Math.hypot(ic.vx, ic.vy);
          if (spd > 5) { ic.vx = (ic.vx / spd) * 5; ic.vy = (ic.vy / spd) * 5; }
        }
        grabbed = null;
        document.body.style.cursor = '';
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, #f8faff 0%, #edf0ff 45%, #f3eeff 100%)',
      }}
    />
  );
}
