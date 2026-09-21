import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CheckoutStripeResponse,
  ConfirmarPagoPruebaRequest,
  CrearCheckoutStripeRequest,
  OrdenPagoResponse,
  PagoFiltros,
  PagoHistorialDetalle,
  PagoHistorialItem,
} from '../models/pago.models';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/pagos`;

  crearCheckoutStripe(request: CrearCheckoutStripeRequest): Observable<CheckoutStripeResponse> {
    return this.http.post<CheckoutStripeResponse>(`${this.apiUrl}/stripe/checkout`, request);
  }

  obtenerOrden(ordenId: number): Observable<OrdenPagoResponse> {
    return this.http.get<OrdenPagoResponse>(`${this.apiUrl}/orden/${ordenId}`);
  }

  confirmarPrueba(ordenId: number, request: ConfirmarPagoPruebaRequest): Observable<OrdenPagoResponse> {
    return this.http.post<OrdenPagoResponse>(`${this.apiUrl}/stripe/confirmar-prueba/${ordenId}`, request);
  }

  listarMisPagos(filtros: PagoFiltros = {}): Observable<PagoHistorialItem[]> {
    return this.http.get<PagoHistorialItem[]>(`${this.apiUrl}/mis-pagos`, {
      params: this.crearParams(filtros),
    });
  }

  obtenerMiPago(ordenId: number): Observable<PagoHistorialDetalle> {
    return this.http.get<PagoHistorialDetalle>(`${this.apiUrl}/mis-pagos/${ordenId}`);
  }

  listarPagos(filtros: PagoFiltros = {}): Observable<PagoHistorialItem[]> {
    return this.http.get<PagoHistorialItem[]>(this.apiUrl, {
      params: this.crearParams(filtros),
    });
  }

  obtenerPago(ordenId: number): Observable<PagoHistorialDetalle> {
    return this.http.get<PagoHistorialDetalle>(`${this.apiUrl}/${ordenId}`);
  }

  private crearParams(filtros: PagoFiltros): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    });
    return params;
  }
}
