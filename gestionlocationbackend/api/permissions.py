from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture publique, écriture réservée aux administrateurs."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsSuperAdminUser(permissions.BasePermission):
    """Acces reserve a l'administrateur systeme."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsOwnerClientOrAdmin(permissions.BasePermission):
    """Le client ne peut accéder qu'à son propre profil ; l'admin à tous."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if view.action in ('create',):
            return True
        return hasattr(request.user, 'client_profile')

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if view.action in permissions.SAFE_METHODS or view.action in ('update', 'partial_update'):
            return hasattr(request.user, 'client_profile') and obj.user_id == request.user.id
        return False


class IsFactureOwnerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if hasattr(request.user, 'client_profile'):
            return obj.reservation.client_id == request.user.client_profile.id
        return False


class IsReservationOwnerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if not hasattr(request.user, 'client_profile'):
            return False
        return obj.client_id == request.user.client_profile.id
