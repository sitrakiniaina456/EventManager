from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Categorie, Lieu, Evenement
from .serializers import (
    CategorieSerializer,
    LieuSerializer,
    EvenementSerializer
)


class StaffWritePermission(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.method in SAFE_METHODS or request.user.is_staff)
        )


class IsOrganizerOrStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or (
            request.user.is_staff or obj.organisateur_id == request.user.id
        )


class ReferencedCatalogViewSet(viewsets.ModelViewSet):
    permission_classes = [StaffWritePermission]

    def perform_destroy(self, instance):
        if instance.evenements.exists():
            raise ValidationError(
                "Cet élément est utilisé par un événement et ne peut pas être supprimé."
            )
        instance.delete()


class CategorieViewSet(ReferencedCatalogViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer


class LieuViewSet(ReferencedCatalogViewSet):
    queryset = Lieu.objects.all()
    serializer_class = LieuSerializer


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.all()
    serializer_class = EvenementSerializer
    permission_classes = [IsOrganizerOrStaff]

    def perform_create(self, serializer):
        serializer.save(organisateur=self.request.user)

    def perform_destroy(self, instance):
        if instance.inscriptions.exists():
            raise ValidationError(
                "Cet événement a des inscriptions. Annulez-les avant de le supprimer."
            )
        instance.delete()


