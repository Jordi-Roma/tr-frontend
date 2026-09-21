import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CatalogoDisponibilidadProductoResponse,
  CatalogoFiltros,
  CatalogoFiltrosResponse,
  CatalogoPrendaDetalle,
  CatalogoPrendasResponse,
  CatalogoSucursal,
} from '../models/catalogo-publico.models';

@Injectable({
  providedIn: 'root',
})
export class CatalogoPublicoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/catalogo`;

  listarPrendas(filtros: CatalogoFiltros = {}): Observable<CatalogoPrendasResponse> {
    return this.http.get<CatalogoPrendasResponse>(`${this.apiUrl}/prendas`, {
      params: this.toParams(filtros),
    });
  }

  obtenerPrenda(id: number, sucursalId?: number | null): Observable<CatalogoPrendaDetalle> {
    const params =
      sucursalId === undefined || sucursalId === null
        ? undefined
        : new HttpParams().set('sucursal_id', String(sucursalId));

    return this.http.get<CatalogoPrendaDetalle>(`${this.apiUrl}/prendas/${id}`, { params });
  }

  obtenerDisponibilidad(
    id: number,
    filtros: Pick<CatalogoFiltros, 'talla_id' | 'color_id' | 'sucursal_id'> = {}
  ): Observable<CatalogoDisponibilidadProductoResponse> {
    return this.http.get<CatalogoDisponibilidadProductoResponse>(
      `${this.apiUrl}/prendas/${id}/disponibilidad`,
      { params: this.toParams(filtros) }
    );
  }

  listarSucursales(): Observable<CatalogoSucursal[]> {
    return this.http.get<CatalogoSucursal[]>(`${this.apiUrl}/sucursales`);
  }

  obtenerFiltros(): Observable<CatalogoFiltrosResponse> {
    return this.http.get<CatalogoFiltrosResponse>(`${this.apiUrl}/filtros`);
  }

  private toParams(filtros: object): HttpParams {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }
}
