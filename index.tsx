
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Polyfill process for browser environment to prevent "process is not defined" crashes
// And to bridge the injected API key from window.__ENV__
if (typeof window !== 'undefined') {
  const env = (window as any).__ENV__ || {};
  
  if (!(window as any).process) {
    (window as any).process = { env: {} };
  } else if (!(window as any).process.env) {
    (window as any).process.env = {};
  }
  
  // Prioritize injected key, fallback to build time if exists
  (window as any).process.env = {
    ...(window as any).process.env,
    NODE_ENV: 'development',
    API_KEY: env.API_KEY && env.API_KEY !== '__API_KEY_PLACEHOLDER__' 
      ? env.API_KEY 
      : ((window as any).process.env.API_KEY || '')
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
