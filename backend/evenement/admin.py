from django.contrib import admin
from .models import Categorie, Lieu, Evenement


admin.site.register(Categorie)
admin.site.register(Lieu)
admin.site.register(Evenement)