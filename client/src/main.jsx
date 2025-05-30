// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './AuthContext.jsx';
import SocketProvider from './contexts/SocketContext.jsx'; // or wherever yours lives
import App from './App.jsx';
import './index.css';

const token = localStorage.getItem('token');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider token={token}>
          <App />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
