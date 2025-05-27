// src/App.jsx

import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppTheme from './Theme.jsx';
import Navbar from './components/Navbar';
import AppRoutes from './Routes';
import './App.css';

export default function App() {
  return (
    <>
      {/* this must be mounted once, at the root of your app */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      <Navbar />
      <AppRoutes />
    </>
  );
}
