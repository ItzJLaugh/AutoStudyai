export default function AILoadingSphere({ size = 80 }) {
  return (
    <div className="ai-sphere-container" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="ai-sphere">
        {/* Horizontal rings */}
        <ellipse cx="50" cy="50" rx="40" ry="10" className="sphere-ring ring-h1" />
        <ellipse cx="50" cy="50" rx="40" ry="25" className="sphere-ring ring-h2" />
        <ellipse cx="50" cy="50" rx="40" ry="40" className="sphere-ring ring-h3" />

        {/* Vertical rings */}
        <ellipse cx="50" cy="50" rx="10" ry="40" className="sphere-ring ring-v1" />
        <ellipse cx="50" cy="50" rx="25" ry="40" className="sphere-ring ring-v2" />

        {/* Diagonal rings */}
        <ellipse cx="50" cy="50" rx="35" ry="15" className="sphere-ring ring-d1" transform="rotate(45 50 50)" />
        <ellipse cx="50" cy="50" rx="35" ry="15" className="sphere-ring ring-d2" transform="rotate(-45 50 50)" />

        {/* Core glow */}
        <circle cx="50" cy="50" r="6" className="sphere-core" />
      </svg>

      <style jsx>{`
        .ai-sphere-container {
          display: flex; align-items: center; justify-content: center;
        }
        .ai-sphere {
          width: 100%; height: 100%;
          animation: sphere-rotate 8s linear infinite;
        }
        .sphere-ring {
          fill: none; stroke-width: 0.8;
          stroke-linecap: round;
          stroke-dasharray: 8 4 12 6;
        }
        .ring-h1 { stroke: var(--accent); opacity: 0.5; animation: ring-pulse1 3s ease-in-out infinite; }
        .ring-h2 { stroke: var(--accent); opacity: 0.35; animation: ring-pulse2 3.5s ease-in-out infinite; }
        .ring-h3 { stroke: var(--accent-secondary); opacity: 0.6; animation: ring-pulse3 2.5s ease-in-out infinite; stroke-dasharray: 6 8 14 4; }
        .ring-v1 { stroke: var(--accent); opacity: 0.4; animation: ring-pulse2 4s ease-in-out infinite; }
        .ring-v2 { stroke: var(--accent-secondary); opacity: 0.3; animation: ring-pulse1 3s ease-in-out infinite 0.5s; }
        .ring-d1 { stroke: var(--accent); opacity: 0.25; animation: ring-pulse3 3s ease-in-out infinite 1s; stroke-dasharray: 10 6 8 8; }
        .ring-d2 { stroke: var(--accent-secondary); opacity: 0.25; animation: ring-pulse1 3.5s ease-in-out infinite 0.8s; stroke-dasharray: 5 10 12 5; }

        .sphere-core {
          fill: var(--accent);
          opacity: 0.7;
          animation: core-pulse 2s ease-in-out infinite;
        }

        @keyframes sphere-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ring-pulse1 {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.5; stroke-width: 0.8; }
          50% { stroke-dashoffset: 15; opacity: 0.3; stroke-width: 1.2; }
        }
        @keyframes ring-pulse2 {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.35; stroke-width: 0.8; }
          50% { stroke-dashoffset: -12; opacity: 0.55; stroke-width: 0.6; }
        }
        @keyframes ring-pulse3 {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.6; stroke-width: 0.8; }
          50% { stroke-dashoffset: 20; opacity: 0.25; stroke-width: 1.0; }
        }
        @keyframes core-pulse {
          0%, 100% { opacity: 0.7; r: 6; }
          50% { opacity: 0.4; r: 8; }
        }
      `}</style>
    </div>
  );
}
