import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Layout, 
  Menu, 
  Button, 
  Avatar, 
  Dropdown, 
  Space, 
  Typography,
  Modal,
  Badge,
  Drawer
} from 'antd';
import {
  HomeOutlined,
  LoginOutlined,
  UserAddOutlined,
  FolderOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuOutlined,
  BellOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { logout, logoutUser } from '../store/authSlice';

const { Header } = Layout;
const { Text } = Typography;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuVisible(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [modal, contextHolder] = Modal.useModal();

  const handleLogout = () => {
    modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти из системы?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      okType: 'danger',
      async onOk() {
        await dispatch(logoutUser()).unwrap();
        dispatch(logout());
        navigate('/login');
        setMobileMenuVisible(false);
      },
    });
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Мой профиль', onClick: () => { navigate('/profile'); setMobileMenuVisible(false); } },
    { key: 'settings', icon: <SettingOutlined />, label: 'Настройки', onClick: () => { navigate('/settings'); setMobileMenuVisible(false); } },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: handleLogout },
  ];

  const getMenuItems = () => {
    const items = [{ key: '/', icon: <HomeOutlined />, label: <NavLink to="/">Главная</NavLink> }];
    if (!isAuthenticated) {
      items.push(
        { key: '/login', icon: <LoginOutlined />, label: <NavLink to="/login">Вход</NavLink> },
        { key: '/register', icon: <UserAddOutlined />, label: <NavLink to="/register">Регистрация</NavLink> },
      );
    } else {
      items.push({ key: '/storage', icon: <FolderOutlined />, label: <NavLink to="/storage">Хранилище</NavLink> });
      if (user?.is_superuser || user?.is_staff) {
        items.push({
          key: '/admin',
          icon: <SettingOutlined />,
          label: (
            <NavLink to="/admin">
              <Space>Админка<Badge size="small" count={0} showZero={false}/></Space>
            </NavLink>
          ),
        });
      }
    }
    return items;
  };

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileMenuVisible(false);
  };

  const selectedKeys = [location.pathname];
  const menuItems = getMenuItems();

  return (
    <>
      {contextHolder}
      <Header style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:'1200px', margin:'0 auto', padding:'0 20px', height:'100%' }}>
          <NavLink to="/" aria-label="My Cloud - Перейти на главную страницу" style={{ display:'flex', alignItems:'center', textDecoration:'none', color:'white' }}>
            <CloudOutlined style={{ fontSize:24, marginRight:8 }}/>
            <Text strong style={{ fontSize:20, color:'inherit' }}>My Cloud</Text>
          </NavLink>

          {!isMobile && (
            <Menu
              mode="horizontal"
              theme="dark"
              selectedKeys={selectedKeys}
              items={menuItems}
              onClick={handleMenuClick}
              overflowedIndicator={null}
              style={{ background:'transparent', border:'none', flex:1, justifyContent:'center' }}
              role="navigation"
              aria-label="Основная навигация"
            />
          )}

          <Space size="middle">
            {isAuthenticated && !isMobile && (
              <>
                <Badge count={0} size="small">
                  <Button type="text" icon={<BellOutlined />} style={{ color:'white' }} aria-label="Уведомления"/>
                </Badge>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']} arrow>
                  <Space style={{ cursor:'pointer', color:'white' }} aria-label="Меню пользователя">
                    <Avatar size="small" icon={<UserOutlined />} src={user?.avatar} alt={`Аватар пользователя ${user?.username}`}/>
                    <Text style={{ color:'white' }}>{user?.full_name || user?.username}</Text>
                  </Space>
                </Dropdown>
              </>
            )}
            {isMobile && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileMenuVisible(true)} style={{ color:'white' }} aria-label="Открыть мобильное меню"/>
            )}
          </Space>
        </div>

        <Drawer
          title={<Space><CloudOutlined/><Text strong>My Cloud</Text></Space>}
          placement="right"
          onClose={() => setMobileMenuVisible(false)}
          open={mobileMenuVisible}
          width={280}
        >
          {isAuthenticated && (
            <div style={{ marginBottom:16 }}>
              <Space>
                <Avatar icon={<UserOutlined />} src={user?.avatar} alt={`Аватар пользователя ${user?.username}`}/>
                <div>
                  <Text strong>{user?.full_name || user?.username}</Text><br/>
                  <Text type="secondary" style={{ fontSize:12 }}>{user?.email}</Text>
                </div>
              </Space>
            </div>
          )}
          <Menu mode="vertical" selectedKeys={selectedKeys} items={menuItems} onClick={handleMenuClick} style={{ border:'none' }}/>
          {isAuthenticated && (
            <Menu mode="vertical" items={userMenuItems} style={{ border:'none', marginTop:16 }}/>
          )}
        </Drawer>
      </Header>
    </>
  );
};

export default Navbar;