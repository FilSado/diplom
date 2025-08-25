import './App.css';
import React from 'react';
import Navbar from './components/Navbar';
import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StoragePage from './pages/StoragePage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/storage" element={
          <PrivateRoute>
            <StoragePage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminPage />
          </PrivateRoute>
        } />
      </Routes>
    </>
  );
}

export default App;
