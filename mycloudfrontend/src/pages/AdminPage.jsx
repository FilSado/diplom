import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table, Switch, Button, Space, Alert, Spin, Typography, Card } from 'antd';
import { DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { fetchUsers, deleteUser, toggleAdmin } from '../store/usersSlice';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function AdminPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Добавляем дефолтные значения, чтобы избежать ошибок, если state.users undefined
  const { list: users = [], loading = false, error = null } = useSelector(state => state.users || {});
  const currentUser = useSelector(state => state.auth.user);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await dispatch(deleteUser(id)).unwrap();
      } catch (err) {
        console.error('Ошибка удаления пользователя:', err);
      }
    }
  };

  const handleToggleAdmin = async (id, currentIsStaff) => {
    try {
      await dispatch(toggleAdmin({ id, isStaff: !currentIsStaff })).unwrap();
    } catch (err) {
      console.error('Ошибка изменения прав администратора:', err);
    }
  };

  // Навигация c помощью useNavigate, чтобы избежать перезагрузки страницы
  const handleViewFiles = (userId) => {
    navigate(`/storage?user_id=${userId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" tip="Загрузка пользователей..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert 
          message="Ошибка загрузки" 
          description={error} 
          type="error" 
          showIcon 
        />
      </div>
    );
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Логин',
      dataIndex: 'username',
      key: 'username',
      ellipsis: true,
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: 'Полное имя',
      dataIndex: 'full_name',
      key: 'full_name',
      ellipsis: true,
      render: (text) => text || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (text) => text || '—',
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      width: 120,
      render: (text) => {
        if (!text) return '—';
        const date = new Date(text);
        return date.toLocaleDateString('ru-RU');
      },
      sorter: (a, b) => new Date(a.date_joined) - new Date(b.date_joined),
    },
    {
      title: 'Администратор',
      key: 'is_staff',
      width: 130,
      render: (_, record) => (
        <Switch
          checked={record.is_staff}
          disabled={record.id === currentUser?.id}
          onChange={() => handleToggleAdmin(record.id, record.is_staff)}
          checkedChildren="Да"
          unCheckedChildren="Нет"
          size="small"
        />
      ),
      filters: [
        { text: 'Администраторы', value: true },
        { text: 'Пользователи', value: false },
      ],
      onFilter: (value, record) => record.is_staff === value,
    },
    {
      title: 'Файлы',
      key: 'files',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          onClick={() => handleViewFiles(record.id)}
          size="small"
          title="Перейти к файлам пользователя"
        >
          Файлы
        </Button>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={record.id === currentUser?.id}
            onClick={() => handleDelete(record.id)}
            title={record.id === currentUser?.id ? 'Нельзя удалить себя' : 'Удалить пользователя'}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2} style={{ marginBottom: '24px' }}>
          Административная панель
        </Title>
        
        {users.length === 0 ? (
          <Alert
            message="Пользователи не найдены"
            description="В системе пока нет зарегистрированных пользователей."
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        ) : (
          <>
            <div style={{ marginBottom: '16px', color: '#666' }}>
              Всего пользователей: <strong>{users.length}</strong>
            </div>
            
            <Table
              rowKey="id"
              dataSource={users}
              columns={columns}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} пользователей`,
                pageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                size: 'small',
              }}
              scroll={{ x: 900 }}
              size="middle"
              bordered
              rowClassName={(record) => 
                record.id === currentUser?.id ? 'current-user-row' : ''
              }
              style={{ 
                background: 'white',
                borderRadius: '8px',
              }}
            />
          </>
        )}
      </Card>
      
      <style jsx>{`
        .current-user-row {
          background-color: #f6ffed !important;
        }
        .current-user-row:hover {
          background-color: #f6ffed !important;
        }
        `}</style>
    </div>
  );
}
