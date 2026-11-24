from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Categorie, Evenement, Lieu


User = get_user_model()


class EvenementPermissionTests(TestCase):
	@classmethod
	def setUpTestData(cls):
		cls.organisateur = User.objects.create_user(
			username="organizer_api",
			password="TestPass123!",
		)
		cls.autre_utilisateur = User.objects.create_user(
			username="other_organizer_api",
			password="TestPass123!",
		)
		cls.administrateur = User.objects.create_superuser(
			username="admin_event_api",
			password="TestPass123!",
			email="event-admin@example.com",
		)
		cls.categorie = Categorie.objects.create(nom="Categorie permissions")
		cls.lieu = Lieu.objects.create(
			nom="Lieu permissions",
			adresse="Antananarivo",
			capacite=100,
		)
		cls.evenement = cls.creer_evenement(
			cls.organisateur,
			"Evenement de l'organisateur",
		)
		cls.evenement_autre = cls.creer_evenement(
			cls.autre_utilisateur,
			"Evenement autre",
		)

	@classmethod
	def creer_evenement(cls, organisateur, titre):
		debut = timezone.now() + timedelta(days=3)
		return Evenement.objects.create(
			titre=titre,
			description="Test permissions",
			date_debut=debut,
			date_fin=debut + timedelta(hours=2),
			capacite=30,
			prix=Decimal("10000.00"),
			categorie=cls.categorie,
			lieu=cls.lieu,
			organisateur=organisateur,
		)

	def setUp(self):
		self.client = APIClient()

	def test_creation_evenement_assigne_automatiquement_organisateur(self):
		self.client.force_authenticate(user=self.organisateur)

		response = self.client.post(
			"/api/evenement/evenements/",
			{
				"titre": "Nouvel événement",
				"description": "Créé depuis l'API",
				"date_debut": (timezone.now() + timedelta(days=4)).isoformat(),
				"date_fin": (timezone.now() + timedelta(days=4, hours=2)).isoformat(),
				"capacite": 20,
				"prix": "0.00",
				"categorie": self.categorie.id,
				"lieu": self.lieu.id,
			},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data["organisateur"], self.organisateur.id)

	def test_organisateur_ne_peut_pas_modifier_evenement_autrui(self):
		self.client.force_authenticate(user=self.organisateur)

		response = self.client.patch(
			f"/api/evenement/evenements/{self.evenement_autre.id}/",
			{"titre": "Tentative"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)

	def test_utilisateur_non_staff_ne_peut_pas_modifier_categories(self):
		self.client.force_authenticate(user=self.organisateur)

		response = self.client.post(
			"/api/evenement/categories/",
			{"nom": "Catégorie non autorisée"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)

	def test_utilisateur_anonyme_ne_peut_pas_lire_evenements(self):
		response = self.client.get("/api/evenement/evenements/")
		self.assertIn(response.status_code, [401, 403])
