import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const Navbar = () => {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav>
      <ul>
        <li><NavLink to="/" className={({ isActive }) => (isActive ? "active" : undefined)}>Главная</NavLink></li>
        {!isAuthenticated && (
          <>
            <li><NavLink to="/login" className={({ isActive }) => (isActive ? "active" : undefined)}>Вход</NavLink></li>
            <li><NavLink to="/register" className={({ isActive }) => (isActive ? "active" : undefined)}>Регистрация</NavLink></li>
          </>
        )}
        <li><NavLink to="/storage" className={({ isActive }) => (isActive ? "active" : undefined)}>Хранилище</NavLink></li>
        <li><NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : undefined)}>Админка</NavLink></li>
        {isAuthenticated && (
          <li>
            <button onClick={handleLogout} style={{
              background: '#343a40',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: '1rem',
            }}>
              Выйти
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
