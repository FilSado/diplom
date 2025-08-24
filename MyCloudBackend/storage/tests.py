from django.test import TestCase

from rest_framework.test import APITestCase
from django.urls import reverse

class RegisterTestCase(APITestCase):
    def setUp(self):
        self.url = reverse('register')  

    def test_register_valid(self):
        data = {
            "username": "UserTest1",
            "first_name": "Евгения",
            "email": "apiuser1@example.com",
            "password": "Abc123!@#"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)

    def test_register_duplicate_email(self):
        user_data = {
            "username": "UserTest2",
            "first_name": "Евгения",
            "email": "userduplicate@example.com",
            "password": "Abc123!@#"
        }
        self.client.post(self.url, user_data, format='json')
        user_data["username"] = "AnotherUser"
        response = self.client.post(self.url, user_data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_register_weak_password(self):
        data = {
            "username": "UserTest3",
            "first_name": "Евгения",
            "email": "apiuser3@example.com",
            "password": "password"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_register_missing_password(self):
        data = {
            "username": "UserTest4",
            "first_name": "Евгения",
            "email": "apiuser4@example.com"
            # пароль отсутствует
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_register_invalid_username(self):
        data = {
            "username": "1badname",
            "first_name": "Евгения",
            "email": "apiuser5@example.com",
            "password": "Abc123!@#"
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)
