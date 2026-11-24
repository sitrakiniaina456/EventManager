
from django.contrib.auth.models import User
from django.db.models.deletion import ProtectedError
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import viewsets

from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer

    def get_queryset(self):
        utilisateurs = super().get_queryset()
        if self.request.user.is_staff:
            return utilisateurs
        return utilisateurs.filter(pk=self.request.user.pk)

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("Vous ne pouvez pas supprimer votre propre compte.")
        try:
            instance.delete()
        except ProtectedError as error:
            raise PermissionDenied(
                "Ce compte est lié à des événements ou inscriptions et ne peut pas être supprimé."
            ) from error

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
