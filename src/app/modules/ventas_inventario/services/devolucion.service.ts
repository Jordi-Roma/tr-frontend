import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { CrearDevolucionRequest, Devolucion, VentaDevolucionElegible } from '../models/devolucion.models';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/devoluciones`;

  listarVentasElegibles(): Observable<VentaDevolucionElegible[]> {
    return this.http.get<VentaDevolucionElegible[]>(`${this.apiUrl}/ventas-elegibles`);
  }

  solicitar(ventaId: number, request: CrearDevolucionRequest): Observable<Devolucion> {
    return this.http.post<Devolucion>(`${this.apiUrl}/ventas/${ventaId}`, request);
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

  recibir(id: number, items: { detalle_id: number; cantidad_aceptada: number }[]): Observable<Devolucion> {
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
