import React from 'react';

// Local SVG implementation of the circular stroke technique documented in DESIGN-REFERENCES.md.
export default function ProgressRing({ completed = 0, total = 1, size = 48, children }) {
  const fraction = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
  return <span className="progress-ring" style={{ width: size, height: size }} aria-hidden="true">
    <svg className="progress-ring-svg" viewBox="0 0 52 52" focusable="false">
      <circle className="progress-ring-track" cx="26" cy="26" r="23" />
      <circle className="progress-ring-value" cx="26" cy="26" r="23" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - fraction * 100}/>
    </svg>
    <span className="progress-ring-center">{children ?? `${Math.round(fraction * 100)}%`}</span>
  </span>;
}
