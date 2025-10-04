import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotAuthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="У вас нет прав доступа к этой странице"
      extra={
        <Button type="primary" onClick={() => navigate(-1)}>
          Назад
        </Button>
      }
    />
  );
};

export default NotAuthorizedPage;