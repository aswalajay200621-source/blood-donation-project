/**
 * ============================================================================
 * File: frontend/src/main.jsx
 * Purpose: Application Root Entry Point
 * ----------------------------------------------------------------------------
 * Description:
 * This file serves as the primary bootstrap entry point for the React frontend.
 * It mounts the React component tree into the DOM root element (`#root`), wraps
 * the application in React.StrictMode for development quality checks, initializes
 * the global authentication provider (`AuthProvider`), and imports global CSS styling.
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

// Mount the React Application to the DOM container element with id 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Global Authentication Context Provider wrapping the entire UI */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
