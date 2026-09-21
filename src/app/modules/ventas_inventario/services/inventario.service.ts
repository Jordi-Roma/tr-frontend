import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CrearTransferenciaRequest,
  InventarioResponse,
  MovimientoInventarioRequest,
  MovimientoInventarioResponse,
  TransferenciaResponse,
} from '../models/inventario.models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1`;

  listarInventario(filtros: Record<string, unknown> = {}): Observable<InventarioResponse[]> {
    return this.http.get<InventarioResponse[]>(`${this.apiUrl}/inventario`, {
      params: this.toParams(filtros),
    });
  }

  actualizarStockMinimo(id: number, stockMinimo: number): Observable<InventarioResponse> {
    return this.http.patch<InventarioResponse>(`${this.apiUrl}/inventario/${id}/stock-minimo`, {
      stock_minimo: stockMinimo,
    });
  }

  listarMovimientos(filtros: Record<string, unknown> = {}): Observable<MovimientoInventarioResponse[]> {
    return this.http.get<MovimientoInventarioResponse[]>(`${this.apiUrl}/movimientos-inventario`, {
      params: this.toParams(filtros),
    });
  }

  registrarMovimiento(request: MovimientoInventarioRequest): Observable<MovimientoInventarioResponse> {
    return this.http.post<MovimientoInventarioResponse>(`${this.apiUrl}/movimientos-inventario`, request);
  }

  listarTransferencias(sucursalId?: number | null): Observable<TransferenciaResponse[]> {
    return this.http.get<TransferenciaResponse[]>(`${this.apiUrl}/transferencias-stock`, {
      params: this.toParams({ sucursal_id: sucursalId }),
    });
  }

  crearTransferencia(request: CrearTransferenciaRequest): Observable<TransferenciaResponse> {
    return this.http.post<TransferenciaResponse>(`${this.apiUrl}/transferencias-stock`, request);
  }

  private toParams(filtros: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
