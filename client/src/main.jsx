// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './AuthContext';
import SocketProvider from './contexts/SocketContext';
import App from './App';
import AppTheme from './Theme';
import './index.css';

const token = localStorage.getItem('token');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppTheme>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider token={token}>
            <App />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppTheme>
  </React.StrictMode>
);
