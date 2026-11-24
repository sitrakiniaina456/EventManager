
from django.db import models, transaction
from django.db.models import Max
from django.utils import timezone

from registrations.models import Inscription


class Billet(models.Model):

    TYPE_CHOICES = [
        ("STANDARD", "Standard"),
        ("VIP", "VIP"),
    ]

    inscription = models.OneToOneField(
        Inscription,
        on_delete=models.CASCADE,
        related_name="billet"
    )

    numero = models.CharField(
        max_length=50,
        unique=True,
        blank=True
    )

    type_billet = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="STANDARD"
    )

    prix = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    date_achat = models.DateTimeField(
        auto_now_add=True
    )

    valide = models.BooleanField(
        default=True
    )

    def save(self, *args, **kwargs):
        if not self.numero:
            annee = timezone.localdate().year
            prefixe = f"EVT-{annee}-"

            with transaction.atomic():
                dernier_billet = (
                    Billet.objects
                    .select_for_update()
                    .filter(numero__startswith=prefixe)
                    .order_by("-id")
                    .first()
                )

                numero = 1

                if dernier_billet:
                    try:
                        numero = (
                            int(dernier_billet.numero.split("-")[-1]) + 1
                        )
                    except (ValueError, IndexError):
                        numero = Billet.objects.filter(
                            numero__startswith=prefixe
                        ).count() + 1

                self.numero = f"{prefixe}{numero:04d}"
                super().save(*args, **kwargs)

            return

        super().save(*args, **kwargs)

    class Meta:
        db_table = "billets"

    def __str__(self):
        return self.numero


class Paiement(models.Model):

    STATUT_CHOICES = [
        ("EN_ATTENTE", "En attente"),
        ("PAYE", "Payé"),
        ("ECHOUE", "Échoué"),
        ("REMBOURSE", "Remboursé"),
    ]

    MODE_CHOICES = [
        ("ESPECES", "Espèces"),
        ("MVOLA", "MVola"),
        ("ORANGE_MONEY", "Orange Money"),
        ("AIRTEL_MONEY", "Airtel Money"),
        ("CARTE", "Carte bancaire"),
    ]

    billet = models.ForeignKey(
        Billet,
        on_delete=models.CASCADE,
        related_name="paiements"
    )

    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    mode_paiement = models.CharField(
        max_length=30,
        choices=MODE_CHOICES
    )

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="EN_ATTENTE"
    )

    reference = models.CharField(
        max_length=100,
        unique=True,
        blank=True
    )

    date_paiement = models.DateTimeField(
        auto_now_add=True
    )

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.localdate().year
            prefixe = f"PAY-{annee}-"

            with transaction.atomic():
                references = (
                    Paiement.objects
                    .filter(reference__startswith=prefixe)
                    .values_list("reference", flat=True)
                )

                dernier_numero = 0

                for reference_existante in references:
                    try:
                        numero_existant = int(
                            reference_existante.split("-")[-1]
                        )
                        dernier_numero = max(
                            dernier_numero,
                            numero_existant
                        )
                    except (ValueError, IndexError):
                        continue

                self.reference = (
                    f"{prefixe}{dernier_numero + 1:04d}"
                )

                super().save(*args, **kwargs)

            return

        super().save(*args, **kwargs)

    class Meta:
        db_table = "paiements"
        constraints = [
            models.UniqueConstraint(
                fields=["billet", "montant", "mode_paiement"],
                name="unique_paiement_billet_montant_mode"
            )
        ]

    def __str__(self):
        return self.reference
