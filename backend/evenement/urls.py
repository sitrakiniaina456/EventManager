from rest_framework.routers import DefaultRouter
from .views import CategorieViewSet, LieuViewSet, EvenementViewSet


router = DefaultRouter()

router.register("categories", CategorieViewSet)
router.register("lieux", LieuViewSet)
router.register("evenements", EvenementViewSet)


urlpatterns = router.urls