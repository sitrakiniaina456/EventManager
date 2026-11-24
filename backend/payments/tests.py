
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from rest_framework.test import APIClient
from rest_framework import serializers

from evenement.models import Categorie, Evenement, Lieu
from registrations.models import Inscription
from payments.models import Billet, Paiement
from payments.serializers import BilletSerializer, PaiementSerializer


User = get_user_model()


class PaiementSerializerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.participant = User.objects.create_user(
            username="paiement_test",
            password="TestPass123!",
        )

        categorie = Categorie.objects.create(
            nom="Categorie paiement test",
        )

        lieu = Lieu.objects.create(
            nom="Lieu paiement test",
            adresse="Antananarivo",
            capacite=100,
        )

        maintenant = timezone.now()

        evenement = Evenement.objects.create(
            titre="Evenement paiement test",
            description="Test des paiements",
            date_debut=maintenant + timedelta(days=2),
            date_fin=maintenant + timedelta(days=2, hours=2),
            capacite=50,
            prix=Decimal("20000.00"),
            categorie=categorie,
            lieu=lieu,
            organisateur=cls.participant,
        )

        inscription = Inscription.objects.create(
            participant=cls.participant,
            evenement=evenement,
        )

        cls.billet = Billet.objects.create(
            inscription=inscription,
            type_billet="STANDARD",
            prix=Decimal("20000.00"),
        )

    def creer_donnees_paiement(self, **modifications):
        donnees = {
            "billet": self.billet.pk,
            "montant": "10000.00",
            "mode_paiement": "MVOLA",
        }
        donnees.update(modifications)
        return donnees

    def test_montant_positif_accepte(self):
        serializer = PaiementSerializer(
            data=self.creer_donnees_paiement()
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )

    def test_montant_nul_refuse(self):
        serializer = PaiementSerializer(
            data=self.creer_donnees_paiement(
                montant="0.00"
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("montant", serializer.errors)

    def test_montant_negatif_refuse(self):
        serializer = PaiementSerializer(
            data=self.creer_donnees_paiement(
                montant="-100.00"
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("montant", serializer.errors)

    def test_montant_superieur_au_prix_refuse(self):
        serializer = PaiementSerializer(
            data=self.creer_donnees_paiement(
                montant="25000.00"
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("montant", serializer.errors)

    
    def test_paiement_identique_refuse(self):
        Paiement.objects.create(
            billet=self.billet,
            montant=Decimal("10000.00"),
            mode_paiement="MVOLA",
        )

        serializer = PaiementSerializer(
            data=self.creer_donnees_paiement()
        )

        self.assertFalse(serializer.is_valid())

        erreurs = str(serializer.errors).lower()

        self.assertTrue(
            "doublon" in erreurs
            or "unique" in erreurs
            or "non_field_errors" in erreurs,
            f"Erreur inattendue : {serializer.errors}",
        )


    def test_prix_billet_nul_refuse(self):
        donnees = {
            "inscription": self.billet.inscription.pk,
            "type_billet": "STANDARD",
            "prix": "0.00",
            "valide": True,
        }

        serializer = BilletSerializer(data=donnees)

        self.assertFalse(serializer.is_valid())
        self.assertIn("prix", serializer.errors)


class PaiementAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.participant = User.objects.create_user(
            username="paiement_api_test",
            password="TestPass123!",
        )

    def setUp(self):
        self.client = APIClient()

    def test_utilisateur_non_connecte_ne_peut_pas_lire_paiements(self):
        reponse = self.client.get(
            "/api/payments/paiements/"
        )

        self.assertIn(reponse.status_code, [401, 403])


class DonneesFinancieresAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.participant = User.objects.create_user(
            username="owner_api",
            password="TestPass123!",
        )
        cls.autre_participant = User.objects.create_user(
            username="other_api",
            password="TestPass123!",
        )
        cls.troisieme_participant = User.objects.create_user(
            username="third_api",
            password="TestPass123!",
        )
        categorie = Categorie.objects.create(nom="Categorie scopes")
        lieu = Lieu.objects.create(
            nom="Lieu scopes",
            adresse="Antananarivo",
            capacite=100,
        )
        evenement = Evenement.objects.create(
            titre="Evenement scopes",
            description="Test de permissions",
            date_debut=timezone.now() + timedelta(days=2),
            date_fin=timezone.now() + timedelta(days=2, hours=1),
            capacite=50,
            prix=Decimal("20000.00"),
            categorie=categorie,
            lieu=lieu,
            organisateur=cls.participant,
        )
        cls.inscription = Inscription.objects.create(
            participant=cls.participant,
            evenement=evenement,
        )
        cls.autre_inscription = Inscription.objects.create(
            participant=cls.autre_participant,
            evenement=evenement,
        )
        cls.autre_inscription_sans_billet = Inscription.objects.create(
            participant=cls.troisieme_participant,
            evenement=evenement,
        )
        cls.billet = Billet.objects.create(
            inscription=cls.inscription,
            prix=Decimal("20000.00"),
        )
        cls.autre_billet = Billet.objects.create(
            inscription=cls.autre_inscription,
            prix=Decimal("20000.00"),
        )
        cls.paiement = Paiement.objects.create(
            billet=cls.billet,
            montant=Decimal("10000.00"),
            mode_paiement="MVOLA",
        )
        cls.autre_paiement = Paiement.objects.create(
            billet=cls.autre_billet,
            montant=Decimal("10000.00"),
            mode_paiement="MVOLA",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.participant)

    def test_billets_et_paiements_sont_limites_au_participant(self):
        billets = self.client.get("/api/payments/billets/")
        paiements = self.client.get("/api/payments/paiements/")

        self.assertEqual(billets.status_code, 200)
        self.assertEqual(paiements.status_code, 200)
        self.assertEqual([item["id"] for item in billets.data], [self.billet.id])
        self.assertEqual([item["id"] for item in paiements.data], [self.paiement.id])

    def test_un_participant_ne_peut_pas_creer_un_billet_pour_autrui(self):
        response = self.client.post(
            "/api/payments/billets/",
            {
                "inscription": self.autre_inscription_sans_billet.id,
                "prix": "20000.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_un_participant_ne_peut_pas_creer_un_paiement_pour_autrui(self):
        response = self.client.post(
            "/api/payments/paiements/",
            {
                "billet": self.autre_billet.id,
                "montant": "5000.00",
                "mode_paiement": "ESPECES",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_statut_paiement_est_reserve_aux_administrateurs(self):
        response = self.client.patch(
            f"/api/payments/paiements/{self.paiement.id}/",
            {"statut": "PAYE"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.paiement.statut, "EN_ATTENTE")
