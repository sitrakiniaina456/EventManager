
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from .models import Inscription
from .serializers import InscriptionSerializer


class InscriptionViewSet(viewsets.ModelViewSet):
    queryset = Inscription.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        utilisateur = self.request.user

        inscriptions = Inscription.objects.select_related(
            "participant",
            "evenement",
        )

        # Les administrateurs peuvent consulter toutes les inscriptions.
        if utilisateur.is_staff:
            return inscriptions.order_by("-id")

        # Chaque participant consulte uniquement ses inscriptions.
        return inscriptions.filter(
            participant=utilisateur
        ).order_by("-id")

    def perform_create(self, serializer):
        utilisateur = self.request.user

        # Le participant connecté est automatiquement associé
        # à sa nouvelle inscription.
        if not utilisateur.is_staff:
            serializer.save(participant=utilisateur)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if not self.request.user.is_staff:
            evenement = serializer.validated_data.get(
                "evenement",
                serializer.instance.evenement,
            )
            statut = serializer.validated_data.get("statut")
            if evenement.pk != serializer.instance.evenement_id or statut != "ANNULEE":
                raise PermissionDenied(
                    "Vous pouvez uniquement annuler votre propre inscription."
                )
        serializer.save()

    def perform_destroy(self, instance):
        if hasattr(instance, "billet"):
            raise ValidationError(
                "Cette inscription possède un billet. Annulez-la plutôt que de la supprimer."
            )
        instance.delete()
