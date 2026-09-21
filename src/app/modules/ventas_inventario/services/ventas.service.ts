import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CrearVentaPresencialRequest,
  VentaPresencialResponse,
} from '../models/inventario.models';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/ventas-presenciales`;

  listarVentas(sucursalId?: number | null): Observable<VentaPresencialResponse[]> {
    let params = new HttpParams();
    if (sucursalId !== undefined && sucursalId !== null) {
      params = params.set('sucursal_id', String(sucursalId));
    }
    return this.http.get<VentaPresencialResponse[]>(this.apiUrl, { params });
  }

  crearVenta(request: CrearVentaPresencialRequest): Observable<VentaPresencialResponse> {
    return this.http.post<VentaPresencialResponse>(this.apiUrl, request);
  }
}
