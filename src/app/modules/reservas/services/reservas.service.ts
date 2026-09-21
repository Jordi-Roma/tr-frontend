import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CambiarEstadoReservaRequest,
  CrearReservaDesdeCarritoRequest,
  FinalizarReservaRequest,
  ReservaPagoResponse,
  ReservaResponse,
} from '../models/reservas.models';

@Injectable({
  providedIn: 'root',
})
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/reservas`;

  crearDesdeCarrito(request: CrearReservaDesdeCarritoRequest): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(`${this.apiUrl}/desde-carrito`, request);
  }

  listarMisReservas(): Observable<ReservaResponse[]> {
    return this.http.get<ReservaResponse[]>(`${this.apiUrl}/mis-reservas`);
  }

  listarReservas(estado?: string | null, sucursalId?: number | null): Observable<ReservaResponse[]> {
    let params = new HttpParams();

    if (estado) {
      params = params.set('estado', estado);
    }

    if (sucursalId !== undefined && sucursalId !== null) {
      params = params.set('sucursal_id', String(sucursalId));
    }

    return this.http.get<ReservaResponse[]>(this.apiUrl, { params });
  }

  obtenerReserva(id: number): Observable<ReservaResponse> {
    return this.http.get<ReservaResponse>(`${this.apiUrl}/${id}`);
  }

  cancelarReserva(id: number): Observable<ReservaResponse> {
    return this.http.patch<ReservaResponse>(`${this.apiUrl}/${id}/cancelar`, {});
  }

  cambiarEstado(id: number, request: CambiarEstadoReservaRequest): Observable<ReservaResponse> {
    return this.http.patch<ReservaResponse>(`${this.apiUrl}/${id}/estado`, request);
  }

  finalizarComoVenta(id: number, request: FinalizarReservaRequest): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(`${this.apiUrl}/${id}/finalizar-venta`, request);
  }

  pagarAnticipoStripe(id: number): Observable<ReservaPagoResponse> {
    return this.http.post<ReservaPagoResponse>(`${this.apiUrl}/${id}/anticipo/stripe`, {});
  }

  finalizarMiReserva(id: number, request: FinalizarReservaRequest): Observable<ReservaPagoResponse> {
    return this.http.post<ReservaPagoResponse>(`${this.apiUrl}/${id}/finalizar`, request);
  }
}
