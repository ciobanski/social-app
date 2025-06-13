// src/main.jsx
import React, { useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthContext, { AuthProvider } from './AuthContext';
import SocketProvider from './contexts/SocketContext';
import App from './App';
import './index.css';

function AppWithSockets() {
  const { token } = useContext(AuthContext);
  return (
    <SocketProvider token={token}>
      <App />
    </SocketProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppWithSockets />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
