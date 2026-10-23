import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../modules/autenticacion/services/auth.service';
import { EmpresaContextoService } from '../services/empresa-contexto.service';

export const empresaGuard: CanActivateFn = () => {
  const contexto = inject(EmpresaContextoService);
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.tieneRol('ADMIN_SAAS')) return true;
  const seleccion = contexto.empresa();
  if (seleccion && (!auth.estaAutenticado() || seleccion.id === auth.usuarioActual()?.empresa_id))
    return true;
  const codigo = auth.usuarioActual()?.empresa_codigo ?? contexto.codigoRecordado();
  if (!codigo) return router.createUrlTree(['/empresa']);
  return contexto.restaurar(codigo).pipe(
    map(() => true),
    catchError(() => {
      contexto.limpiar();
      return of(router.createUrlTree(['/empresa'], { queryParams: { error: 'empresa' } }));
    }),
  );
};

export const alcanceGuard: CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (
    auth.tieneRol('ADMIN_SAAS') &&
    !/^\/(saas(?:\/|$)|roles(?:\?|$)|ciudades(?:\?|$)|perfil(?:\?|$))/.test(state.url)
  )
    return router.createUrlTree(['/saas/empresas']);
  return true;
};
