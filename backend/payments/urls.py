from rest_framework.routers import DefaultRouter
from .views import BilletViewSet, PaiementViewSet


router = DefaultRouter()

router.register("billets", BilletViewSet)
router.register("paiements", PaiementViewSet)

urlpatterns = router.urls