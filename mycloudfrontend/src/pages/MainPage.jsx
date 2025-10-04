import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function MainPage() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <Title>Облачное хранилище My Cloud</Title>
      <Paragraph>Добро пожаловать! Войдите или зарегистрируйтесь в меню.</Paragraph>
    </div>
  );
}
