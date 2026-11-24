from rest_framework.routers import DefaultRouter
from .views import InscriptionViewSet


router = DefaultRouter()

router.register("inscriptions", InscriptionViewSet)

urlpatterns = router.urls