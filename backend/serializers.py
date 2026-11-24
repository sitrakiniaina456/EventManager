from rest_framework import serializers
from .models import Categorie, Lieu, Evenement


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = "__all__"


class LieuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lieu
        fields = "__all__"


class EvenementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evenement
        fields = "__all__"