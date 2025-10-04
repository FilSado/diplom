import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotAuthorizedPage from '../NotAuthorizedPage';
import { MemoryRouter } from 'react-router-dom';

const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('NotAuthorizedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 403 message and Back button', () => {
    render(
      <MemoryRouter>
        <NotAuthorizedPage />
      </MemoryRouter>
    );
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('У вас нет прав доступа к этой странице')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument();
  });

  it('calls navigate(-1) on Back button click', () => {
    render(
      <MemoryRouter>
        <NotAuthorizedPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(mockedNavigate).toHaveBeenCalledWith(-1);
  });
});
