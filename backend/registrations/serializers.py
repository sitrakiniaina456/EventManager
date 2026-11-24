
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Inscription


class InscriptionSerializer(serializers.ModelSerializer):
    participant_detail = serializers.SerializerMethodField()
    evenement_detail = serializers.SerializerMethodField()

    class Meta:
        model = Inscription
        fields = "__all__"
        read_only_fields = [
            "participant",
            "date_inscription",
            "participant_detail",
            "evenement_detail",
        ]

    def get_participant_detail(self, obj):
        participant = obj.participant

        return {
            "id": participant.id,
            "username": getattr(participant, "username", ""),
            "first_name": getattr(participant, "first_name", ""),
            "last_name": getattr(participant, "last_name", ""),
            "email": getattr(participant, "email", ""),
        }

    def get_evenement_detail(self, obj):
        evenement = obj.evenement

        return {
            "id": evenement.id,
            "titre": getattr(evenement, "titre", ""),
            "nom": getattr(evenement, "nom", ""),
        }

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_staff:
            fields["participant"].read_only = False
            fields["participant"].queryset = get_user_model().objects.all()
        return fields
