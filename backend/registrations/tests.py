
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from rest_framework.test import APIClient

from evenement.models import Categorie, Evenement, Lieu
from registrations.models import Inscription


User = get_user_model()


class InscriptionModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.participant = User.objects.create_user(
            username="participant_test",
            password="TestPass123!",
        )

        cls.categorie = Categorie.objects.create(
            nom="Categorie test",
            description="Categorie utilisee pour les tests",
        )

        cls.lieu = Lieu.objects.create(
            nom="Salle test",
            adresse="Antananarivo",
            capacite=100,
        )

        maintenant = timezone.now()

        cls.evenement = Evenement.objects.create(
            titre="Evenement test",
            description="Evenement de test",
            date_debut=maintenant + timedelta(days=2),
            date_fin=maintenant + timedelta(days=2, hours=2),
            capacite=50,
            prix=Decimal("20000.00"),
            categorie=cls.categorie,
            lieu=cls.lieu,
            organisateur=cls.participant,
        )

    def test_creer_inscription(self):
        inscription = Inscription.objects.create(
            participant=self.participant,
            evenement=self.evenement,
        )

        self.assertEqual(inscription.participant, self.participant)
        self.assertEqual(inscription.evenement, self.evenement)
        self.assertEqual(inscription.statut, "EN_ATTENTE")

    def test_refuser_inscription_en_double(self):
        Inscription.objects.create(
            participant=self.participant,
            evenement=self.evenement,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Inscription.objects.create(
                    participant=self.participant,
                    evenement=self.evenement,
                )


class InscriptionAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.participant1 = User.objects.create_user(
            username="participant_api_1",
            password="TestPass123!",
        )

        cls.participant2 = User.objects.create_user(
            username="participant_api_2",
            password="TestPass123!",
        )
        cls.administrateur = User.objects.create_superuser(
            username="administrateur_api",
            password="TestPass123!",
            email="admin@example.com",
        )

        cls.categorie = Categorie.objects.create(
            nom="Categorie API test",
        )

        cls.lieu = Lieu.objects.create(
            nom="Lieu API test",
            adresse="Antananarivo",
            capacite=100,
        )

        maintenant = timezone.now()

        cls.evenement = Evenement.objects.create(
            titre="Evenement API test",
            description="Test API",
            date_debut=maintenant + timedelta(days=3),
            date_fin=maintenant + timedelta(days=3, hours=2),
            capacite=50,
            prix=Decimal("10000.00"),
            categorie=cls.categorie,
            lieu=cls.lieu,
            organisateur=cls.participant1,
        )

        Inscription.objects.create(
            participant=cls.participant1,
            evenement=cls.evenement,
        )

        Inscription.objects.create(
            participant=cls.participant2,
            evenement=cls.evenement,
        )

    def setUp(self):
        self.client = APIClient()

    def test_utilisateur_non_connecte_ne_peut_pas_lire_inscriptions(self):
        reponse = self.client.get("/api/registrations/inscriptions/")

        self.assertIn(reponse.status_code, [401, 403])

    def test_participant_ne_voit_que_ses_inscriptions(self):
        self.client.force_authenticate(user=self.participant1)

        reponse = self.client.get("/api/registrations/inscriptions/")

        self.assertEqual(reponse.status_code, 200)

        donnees = reponse.data
        if isinstance(donnees, dict) and "results" in donnees:
            donnees = donnees["results"]

        self.assertEqual(len(donnees), 1)
        self.assertEqual(
            donnees[0]["participant"],
            self.participant1.id,
        )

    def test_creation_inscription_associe_utilisateur_connecte(self):
        autre_evenement = Evenement.objects.create(
            titre="Deuxieme evenement API",
            description="Test creation inscription",
            date_debut=timezone.now() + timedelta(days=5),
            date_fin=timezone.now() + timedelta(days=5, hours=2),
            capacite=30,
            prix=Decimal("15000.00"),
            categorie=self.categorie,
            lieu=self.lieu,
            organisateur=self.participant1,
        )

        self.client.force_authenticate(user=self.participant1)

        reponse = self.client.post(
            "/api/registrations/inscriptions/",
            {
                "evenement": autre_evenement.id,
                "statut": "EN_ATTENTE",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 201)

        inscription = Inscription.objects.get(
            evenement=autre_evenement,
            participant=self.participant1,
        )

        self.assertEqual(inscription.participant, self.participant1)

    def test_administrateur_peut_creer_une_inscription_pour_un_participant(self):
        autre_evenement = Evenement.objects.create(
            titre="Evenement admin",
            description="Creation admin",
            date_debut=timezone.now() + timedelta(days=6),
            date_fin=timezone.now() + timedelta(days=6, hours=2),
            capacite=30,
            prix=Decimal("10000.00"),
            categorie=self.categorie,
            lieu=self.lieu,
            organisateur=self.administrateur,
        )
        self.client.force_authenticate(user=self.administrateur)

        reponse = self.client.post(
            "/api/registrations/inscriptions/",
            {
                "participant": self.participant2.id,
                "evenement": autre_evenement.id,
                "statut": "EN_ATTENTE",
            },
            format="json",
        )

        self.assertEqual(reponse.status_code, 201)
        self.assertEqual(reponse.data["participant"], self.participant2.id)

    def test_participant_peut_annuler_mais_pas_confirmer_son_inscription(self):
        inscription = Inscription.objects.get(participant=self.participant1)
        self.client.force_authenticate(user=self.participant1)

        interdite = self.client.patch(
            f"/api/registrations/inscriptions/{inscription.id}/",
            {"statut": "CONFIRMEE"},
            format="json",
        )
        autorisee = self.client.patch(
            f"/api/registrations/inscriptions/{inscription.id}/",
            {"statut": "ANNULEE"},
            format="json",
        )

        self.assertEqual(interdite.status_code, 403)
        self.assertEqual(autorisee.status_code, 200)
        inscription.refresh_from_db()
        self.assertEqual(inscription.statut, "ANNULEE")
