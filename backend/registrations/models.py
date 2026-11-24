from django.db import models
from django.conf import settings
from evenement.models import Evenement


class Inscription(models.Model):

    STATUT_CHOICES = [
        ("EN_ATTENTE", "En attente"),
        ("CONFIRMEE", "Confirmée"),
        ("ANNULEE", "Annulée"),
    ]

    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inscriptions"
    )

    evenement = models.ForeignKey(
        Evenement,
        on_delete=models.CASCADE,
        related_name="inscriptions"
    )

    date_inscription = models.DateTimeField(auto_now_add=True)

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="EN_ATTENTE"
    )

    class Meta:
        db_table = "inscriptions"
        verbose_name = "Inscription"
        verbose_name_plural = "Inscriptions"
        constraints = [
            models.UniqueConstraint(
                fields=["participant", "evenement"],
                name="unique_participant_evenement"
            )
        ]

    def __str__(self):
        return f"{self.participant} - {self.evenement}"