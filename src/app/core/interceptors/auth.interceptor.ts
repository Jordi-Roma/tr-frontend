import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, takeUntil, throwError } from 'rxjs';
import { AuthService } from '../../modules/autenticacion/services/auth.service';
import { API_BASE_URL } from '../config/api.config';
import { EmpresaContextoService } from '../services/empresa-contexto.service';
import { CambioContextoService } from '../services/cambio-contexto.service';
import { EstadoPlanService } from '../services/estado-plan.service';
import { esErrorVigencia, esOperacionNueva, mensajeApi } from '../services/error-api';

export function esPeticionApi(url: string): boolean {
  try {
    const base = new URL(API_BASE_URL, globalThis.location?.origin ?? 'http://localhost');
    const destino = new URL(url, globalThis.location?.origin ?? 'http://localhost');
    return (
      base.origin === destino.origin &&
      destino.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/api/v1/')
    );
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!esPeticionApi(request.url)) return next(request);
  const auth = inject(AuthService);
  const contexto = inject(EmpresaContextoService);
  const cambios = inject(CambioContextoService);
  const estado = inject(EstadoPlanService);
  const router = inject(Router);
  const usuario = auth.usuarioActual();
  const empresa = contexto.empresa();
  const ruta = new URL(request.url, globalThis.location?.origin ?? 'http://localhost').pathname;
  const plataforma = usuario?.empresa_id === null && auth.tieneRol('ADMIN_SAAS');
  if (
    usuario &&
    !plataforma &&
    (usuario.empresa_id !== empresa?.id || usuario.empresa_codigo !== empresa?.codigo)
  ) {
    void router.navigateByUrl('/empresa');
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 403,
          error: { detail: 'Selecciona la empresa de tu sesión o cierra sesión para cambiar.' },
        }),
    );
  }
  if (!plataforma && !estado.operacionesPermitidas() && esOperacionNueva(request.method, ruta)) {
    estado.notificar(
      'No se permiten operaciones nuevas. Puedes consultar tus datos y resolver pagos pendientes o devoluciones.',
    );
    return throwError(
      () => new HttpErrorResponse({ status: 403, error: { detail: estado.mensaje() } }),
    );
  }
  const headers: Record<string, string> = {};
  if (auth.obtenerToken()) headers['Authorization'] = `Bearer ${auth.obtenerToken()}`;
  if (empresa && !plataforma) headers['X-Empresa-Codigo'] = empresa.codigo;
  return next(request.clone({ setHeaders: headers })).pipe(
    takeUntil(cambios.cambio$),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const mensaje = mensajeApi(error);
      if (esErrorVigencia(error)) estado.restringir();
      if (error.status === 403 || error.status === 409 || error.status === 503)
        estado.notificar(mensaje);
      if (error.status === 401 && auth.estaAutenticado() && !ruta.includes('/autenticacion/')) {
        auth.limpiarSesion();
        void router.navigate([plataforma ? '/saas/login' : '/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      // Existing pages also expect detail to be a string. Preserve status and the original payload.
      return throwError(
        () =>
          new HttpErrorResponse({
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
            headers: error.headers,
            error: { detail: mensaje },
          }),
      );
    }),
  );
};
