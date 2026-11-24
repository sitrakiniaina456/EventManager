from django.db import models
from django.conf import settings


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "categories"
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.nom


class Lieu(models.Model):
    nom = models.CharField(max_length=150)
    adresse = models.CharField(max_length=255)
    capacite = models.PositiveIntegerField()

    class Meta:
        db_table = "lieux"
        verbose_name = "Lieu"
        verbose_name_plural = "Lieux"

    def __str__(self):
        return self.nom


class Evenement(models.Model):

    STATUT_CHOICES = [
        ("A_VENIR", "À venir"),
        ("EN_COURS", "En cours"),
        ("TERMINE", "Terminé"),
        ("ANNULE", "Annulé"),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()

    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()

    image = models.ImageField(
        upload_to="evenements/",
        blank=True,
        null=True
    )

    capacite = models.PositiveIntegerField()

    prix = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="A_VENIR"
    )

    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.PROTECT,
        related_name="evenements"
    )

    lieu = models.ForeignKey(
        Lieu,
        on_delete=models.PROTECT,
        related_name="evenements"
    )

    organisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evenements_organises"
    )

    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "evenements"
        verbose_name = "Événement"
        verbose_name_plural = "Événements"
        ordering = ["-date_creation"]

    def __str__(self):
        return self.titre