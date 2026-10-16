import React from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './styles.css';
import App from './App.jsx';
import AccessGate from './components/AccessGate.jsx';
import './polish.css';

createRoot(document.getElementById('root')).render(<AccessGate>{onLock => <App onLock={onLock}/>}</AccessGate>);
