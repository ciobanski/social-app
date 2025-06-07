import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppTheme from './Theme.jsx';
import AppRoutes from './Routes.jsx';


export default function App() {


  return (
    <AppTheme>
      {/* Global toasts */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      {/* All routes (Layout wraps the header + content) */}
      <AppRoutes />
    </AppTheme>
  );
}
