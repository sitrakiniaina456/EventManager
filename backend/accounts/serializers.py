
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "password",
        ]
        read_only_fields = ["id"]

    def validate_password(self, value):
        validate_password(value, user=self.instance)
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance and request and self.instance.pk == request.user.pk:
            if attrs.get("is_staff") is False or attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    "Vous ne pouvez pas désactiver ou rétrograder votre propre compte."
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "Ce champ est obligatoire."})

        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
