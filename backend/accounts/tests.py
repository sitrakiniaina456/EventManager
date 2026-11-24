from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


User = get_user_model()


class UserAPITests(TestCase):
	@classmethod
	def setUpTestData(cls):
		cls.member = User.objects.create_user(
			username="member_api",
			password="TestPass123!",
		)
		cls.admin = User.objects.create_superuser(
			username="admin_api",
			password="TestPass123!",
			email="admin@example.com",
		)

	def setUp(self):
		self.client = APIClient()

	def test_user_anonyme_refuse(self):
		response = self.client.get("/api/accounts/users/")
		self.assertIn(response.status_code, [401, 403])

	def test_utilisateur_non_staff_ne_voit_que_son_compte(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.get("/api/accounts/users/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual([user["id"] for user in response.data], [self.member.id])

	def test_utilisateur_non_staff_ne_peut_pas_creer_de_compte(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.post(
			"/api/accounts/users/",
			{"username": "blocked_user", "password": "TestPass123!"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)
		self.assertFalse(User.objects.filter(username="blocked_user").exists())

	def test_admin_cree_un_compte_avec_mot_de_passe_hache(self):
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			"/api/accounts/users/",
			{"username": "new_member", "password": "TestPass123!"},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		self.assertNotIn("password", response.data)
		utilisateur = User.objects.get(username="new_member")
		self.assertTrue(utilisateur.check_password("TestPass123!"))

	def test_endpoint_me_retourne_le_compte_connecte(self):
		self.client.force_authenticate(user=self.member)

		response = self.client.get("/api/accounts/users/me/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["id"], self.member.id)
