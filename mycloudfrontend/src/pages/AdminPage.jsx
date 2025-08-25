import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

// Асинхронные действия для пользователей
import { fetchUsers, deleteUser, toggleAdmin } from '../store/usersSlice';

const AdminPage = () => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector(state => state.users);
  const { user: currentUser } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleDelete = (id) => {
    if (window.confirm('Удалить пользователя?')) {
      dispatch(deleteUser(id));
    }
  };

  const handleToggleAdmin = (id, currentIsAdmin) => {
    dispatch(toggleAdmin({ id, isAdmin: !currentIsAdmin }));
  };

  if (loading) return <p>Загрузка пользователей...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="container">
      <h2>Административная панель</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Логин</th>
            <th>Полное имя</th>
            <th>Email</th>
            <th>Администратор</th>
            <th>Файлы</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #ccc' }}>
              <td>{u.login}</td>
              <td>{u.full_name}</td>
              <td>{u.email}</td>
              <td>
                <input
                  type="checkbox"
                  checked={u.is_admin}
                  disabled={currentUser.id === u.id}
                  onChange={() => handleToggleAdmin(u.id, u.is_admin)}
                />
              </td>
              <td>
                <a href={`/storage?user=${u.id}`}>Перейти</a>
              </td>
              <td>
                <button
                  disabled={currentUser.id === u.id}
                  onClick={() => handleDelete(u.id)}
                  style={{ color: 'red' }}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;
