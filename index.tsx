
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("App booting up...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Could not find root element");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Render error:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;"><h1>App Crash</h1><pre>${error}</pre></div>`;
  }
}
