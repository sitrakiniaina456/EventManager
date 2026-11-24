from django.contrib import admin
from .models import Billet, Paiement

admin.site.register(Billet)
admin.site.register(Paiement)