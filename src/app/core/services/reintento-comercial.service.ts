import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../../modules/autenticacion/services/auth.service';

/** Conserva la clave si se pierde la respuesta; una operación exitosa inicia otra clave. */
@Injectable({ providedIn: 'root' })
export class ReintentoComercialService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly pendientes = new Map<string, string>();

  post<T>(url: string, datos: object): Observable<T> {
    const usuario = this.auth.usuarioActual();
    const identidad = JSON.stringify([usuario?.id, usuario?.empresa_id, url, datos]);
    const clave = this.pendientes.get(identidad) ?? crypto.randomUUID();
    this.pendientes.set(identidad, clave);
    return this.http.post<T>(url, { ...datos, clave_operacion: clave }).pipe(
      tap(() => this.pendientes.delete(identidad)),
      catchError((error: HttpErrorResponse) => {
        if (error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) {
          this.pendientes.delete(identidad);
        }
        return throwError(() => error);
      }),
    );
  }
}
