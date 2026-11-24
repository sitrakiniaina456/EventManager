
from decimal import Decimal

from rest_framework import serializers

from .models import Billet, Paiement


class BilletSerializer(serializers.ModelSerializer):

    class Meta:
        model = Billet
        fields = "__all__"
        read_only_fields = [
            "numero",
            "date_achat",
        ]

    def validate_prix(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Le prix du billet doit être supérieur à zéro."
            )

        return value


class PaiementSerializer(serializers.ModelSerializer):

    class Meta:
        model = Paiement
        fields = "__all__"
        read_only_fields = [
            "reference",
            "date_paiement",
        ]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if not request or not request.user.is_staff:
            fields["statut"].read_only = True
        return fields

    def validate_montant(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError(
                "Le montant du paiement doit être supérieur à zéro."
            )

        return value

    def validate(self, attrs):
        billet = attrs.get(
            "billet",
            getattr(self.instance, "billet", None),
        )

        montant = attrs.get(
            "montant",
            getattr(self.instance, "montant", None),
        )

        mode_paiement = attrs.get(
            "mode_paiement",
            getattr(self.instance, "mode_paiement", None),
        )

        if billet is not None and montant is not None:
            if montant > billet.prix:
                raise serializers.ValidationError({
                    "montant": (
                        "Le montant ne peut pas dépasser "
                        "le prix du billet."
                    )
                })

        doublons = Paiement.objects.all()

        if billet is not None:
            doublons = doublons.filter(billet=billet)

        if montant is not None:
            doublons = doublons.filter(montant=montant)

        if mode_paiement is not None:
            doublons = doublons.filter(
                mode_paiement=mode_paiement
            )

        if self.instance is not None:
            doublons = doublons.exclude(pk=self.instance.pk)

        if doublons.exists():
            raise serializers.ValidationError({
                "doublon": (
                    "Ce paiement existe déjà pour ce billet, "
                    "ce montant et ce mode de paiement."
                )
            })

        return attrs
