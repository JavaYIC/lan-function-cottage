import React from 'react';
import katex from 'katex';

export function MathText({ text = '', className = '' }) {
  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
  return <span className={`math-text ${className}`}>{parts.map((part, i) => {
    if (!part.startsWith('$')) return <React.Fragment key={i}>{part}</React.Fragment>;
    const displayMode = part.startsWith('$$');
    const formula = part.slice(displayMode ? 2 : 1, displayMode ? -2 : -1);
    try {
      const html = katex.renderToString(formula, { displayMode, throwOnError: true, trust: false, strict: 'warn', output: 'htmlAndMathml' });
      return <span key={i} className={displayMode ? 'math-block' : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span key={i}>{formula}</span>;
    }
  })}</span>;
}
