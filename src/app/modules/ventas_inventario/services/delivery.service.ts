import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  DeliveryCotizacionResponse,
  DeliveryCotizarRequest,
  DeliveryDetalle,
  DeliveryEstadoRequest,
  DeliveryEstadoResponse,
  DeliveryFiltros,
  DeliveryGeocodificarResponse,
  DeliveryItem,
} from '../models/delivery.models';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/delivery`;

  cotizar(request: DeliveryCotizarRequest): Observable<DeliveryCotizacionResponse> {
    return this.http.post<DeliveryCotizacionResponse>(`${this.apiUrl}/cotizar`, request);
  }

  geocodificar(direccion: string): Observable<DeliveryGeocodificarResponse> {
    return this.http.get<DeliveryGeocodificarResponse>(`${this.apiUrl}/geocodificar`, {
      params: new HttpParams().set('direccion', direccion),
    });
  }

  listarMisDeliveries(estado?: string | null): Observable<DeliveryItem[]> {
    return this.http.get<DeliveryItem[]>(`${this.apiUrl}/mis-deliveries`, {
      params: this.crearParams({ estado }),
    });
  }

  obtenerMiDelivery(deliveryId: number): Observable<DeliveryDetalle> {
    return this.http.get<DeliveryDetalle>(`${this.apiUrl}/mis-deliveries/${deliveryId}`);
  }

  listarDeliveries(filtros: DeliveryFiltros = {}): Observable<DeliveryItem[]> {
    return this.http.get<DeliveryItem[]>(this.apiUrl, {
      params: this.crearParams(filtros),
    });
  }

  obtenerDelivery(deliveryId: number): Observable<DeliveryDetalle> {
    return this.http.get<DeliveryDetalle>(`${this.apiUrl}/${deliveryId}`);
  }

  actualizarEstado(deliveryId: number, request: DeliveryEstadoRequest): Observable<DeliveryEstadoResponse> {
    return this.http.patch<DeliveryEstadoResponse>(`${this.apiUrl}/${deliveryId}/estado`, request);
  }

  private crearParams(filtros: DeliveryFiltros): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros as Record<string, string | number | null | undefined>).forEach(([key, value]) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    });
    return params;
  }
}
