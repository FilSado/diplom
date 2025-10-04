import React from 'react';
import { render, screen } from '@testing-library/react';
import MainPage from '../MainPage';

describe('MainPage', () => {
  it('renders welcome text', () => {
    render(<MainPage />);
    expect(screen.getByText('Облачное хранилище My Cloud')).toBeInTheDocument();
    expect(screen.getByText('Добро пожаловать! Войдите или зарегистрируйтесь в меню.')).toBeInTheDocument();
  });
});
