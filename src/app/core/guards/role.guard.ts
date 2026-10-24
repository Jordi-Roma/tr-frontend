import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../modules/autenticacion/services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rolesEsperados = route.data['roles'];

  if (!authService.estaAutenticado()) {
    const plataforma =
      state.url.startsWith('/saas/') ||
      (Array.isArray(rolesEsperados) &&
        rolesEsperados.length === 1 &&
        rolesEsperados[0] === 'ADMIN_SAAS');
    return router.createUrlTree([plataforma ? '/saas/login' : '/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  if (!Array.isArray(rolesEsperados)) {
    return true;
  }

  const tienePermiso = rolesEsperados.some(
    (rol) => typeof rol === 'string' && authService.tieneRol(rol),
  );

  if (tienePermiso) {
    const permiso = route.data['permiso'];
    if (typeof permiso === 'string') {
      const plataforma = authService.tieneRol('ADMIN_SAAS');
      return authService.cargarCapacidades().pipe(
        map(() => (authService.puede(permiso) ? true : router.createUrlTree(['/403']))),
        catchError(() =>
          of(
            router.createUrlTree(
              [authService.estaAutenticado() ? '/403' : plataforma ? '/saas/login' : '/login'],
              { queryParams: { returnUrl: state.url } },
            ),
          ),
        ),
      );
    }
    return true;
  }

  return router.createUrlTree(['/403']);
};
