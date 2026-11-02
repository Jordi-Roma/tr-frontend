import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../../autenticacion/services/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { CrearDevolucionRequest, Devolucion, VentaDevolucionElegible } from '../models/devolucion.models';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  private readonly http = inject(HttpClient);
  private readonly auth=inject(AuthService);
  private readonly claves=new Map<string,string>();
  politica(){return this.http.get<{devoluciones_habilitadas:boolean;plazo_devoluciones:number|null;condiciones_devoluciones:string}>(API_BASE_URL+'/api/v1/posventa/politica');}
  aceptar(id:number,monto:number|string){return this.http.post<Devolucion>(API_BASE_URL+`/api/v1/posventa/devoluciones/${id}/aceptar`,{monto});}
  private readonly apiUrl = `${API_BASE_URL}/api/v1/devoluciones`;

  listarVentasElegibles(): Observable<VentaDevolucionElegible[]> {
    return this.http.get<VentaDevolucionElegible[]>(`${this.apiUrl}/ventas-elegibles`);
  }

  solicitar(ventaId: number, request: CrearDevolucionRequest): Observable<Devolucion> {
    const huella = JSON.stringify({empresa:this.auth.usuarioActual()?.empresa_id,usuario:this.auth.usuarioActual()?.id,ventaId,request});
    const espacio = 'stylear_devolucion:' + huella;
    let clave = this.claves.get(huella);
    try { clave ??= sessionStorage.getItem(espacio) ?? undefined; } catch { /* La memoria conserva el intento. */ }
    clave ??= crypto.randomUUID();
    this.claves.set(huella, clave);
    try { sessionStorage.setItem(espacio, clave); } catch { /* Continuar con la clave en memoria. */ }
    return this.http.post<Devolucion>(`${this.apiUrl}/ventas/${ventaId}`, {...request,clave_operacion:clave}).pipe(tap(() => {
      this.claves.delete(huella);
      try { sessionStorage.removeItem(espacio); } catch { /* Sin persistencia local. */ }
    }));
  }

  listarPropias(): Observable<Devolucion[]> {
    return this.http.get<Devolucion[]>(`${this.apiUrl}/mis-devoluciones`);
  }

  cancelarPropia(id: number): Observable<Devolucion> {
    return this.http.patch<Devolucion>(`${this.apiUrl}/mis-devoluciones/${id}/cancelar`, {});
  }

  listarGestion(estado?: string): Observable<Devolucion[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<Devolucion[]>(this.apiUrl, { params });
  }

  revisar(id: number, aprobar: boolean, observacion: string): Observable<Devolucion> {
    return this.http.patch<Devolucion>(`${this.apiUrl}/${id}/revision`, { aprobar, observacion });
  }

  recibir(id: number, items: { detalle_id: number; cantidad_aceptada: number;cantidad_no_vendible?:number;observacion?:string }[]): Observable<Devolucion> {
    return this.http.patch<Devolucion>(`${this.apiUrl}/${id}/recepcion`, { items });
  }

  reembolsarStripe(id: number): Observable<Devolucion> {
    return this.http.post<Devolucion>(`${this.apiUrl}/${id}/reembolso`, {});
  }

  reembolsarManual(id: number, metodo: string, referencia: string, observacion: string): Observable<Devolucion> {
    return this.http.post<Devolucion>(`${this.apiUrl}/${id}/reembolso/manual`, {
      metodo,
      referencia,
      observacion,
    });
  }
}
