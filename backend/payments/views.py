
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import Billet, Paiement
from .serializers import BilletSerializer, PaiementSerializer


class BilletViewSet(viewsets.ModelViewSet):
    queryset = Billet.objects.select_related(
        "inscription",
        "inscription__participant",
        "inscription__evenement",
    ).all().order_by("-id")

    serializer_class = BilletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        billets = super().get_queryset()
        if self.request.user.is_staff:
            return billets
        return billets.filter(inscription__participant=self.request.user)

    def _verifier_proprietaire(self, inscription):
        if (
            not self.request.user.is_staff
            and inscription.participant_id != self.request.user.id
        ):
            raise PermissionDenied("Cette inscription ne vous appartient pas.")

    def perform_create(self, serializer):
        self._verifier_proprietaire(serializer.validated_data["inscription"])
        serializer.save()

    def perform_update(self, serializer):
        inscription = serializer.validated_data.get(
            "inscription",
            serializer.instance.inscription,
        )
        self._verifier_proprietaire(inscription)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.paiements.exists():
            raise ValidationError(
                "Ce billet possède des paiements et ne peut pas être supprimé."
            )
        instance.delete()


class PaiementViewSet(viewsets.ModelViewSet):
    queryset = Paiement.objects.select_related(
        "billet",
        "billet__inscription",
        "billet__inscription__participant",
        "billet__inscription__evenement",
    ).all().order_by("-id")

    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        paiements = super().get_queryset()
        if self.request.user.is_staff:
            return paiements
        return paiements.filter(billet__inscription__participant=self.request.user)

    def _verifier_proprietaire(self, billet):
        if (
            not self.request.user.is_staff
            and billet.inscription.participant_id != self.request.user.id
        ):
            raise PermissionDenied("Ce billet ne vous appartient pas.")

    def perform_create(self, serializer):
        self._verifier_proprietaire(serializer.validated_data["billet"])
        serializer.save()

    def perform_update(self, serializer):
        billet = serializer.validated_data.get(
            "billet",
            serializer.instance.billet,
        )
        self._verifier_proprietaire(billet)
        serializer.save()
