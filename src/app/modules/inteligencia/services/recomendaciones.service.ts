import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { CatalogoPrendaItem } from '../../catalogo/models/catalogo-publico.models';

export interface PreferenciasIA {
  categorias: number[];
  usar_historial: boolean;
}

export interface RecomendacionPrenda extends CatalogoPrendaItem {
  motivo: string;
  score?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RecomendacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/v1/recomendaciones`;

  porProducto(id: number, sucursalId?: number | null, tallaId?: number | null): Observable<RecomendacionPrenda[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursal_id', sucursalId);
    if (tallaId != null) params = params.set('talla_id', tallaId);
    return this.http.get<RecomendacionPrenda[]>(`${this.url}/producto/${id}`, { params });
  }

  paraMi(): Observable<RecomendacionPrenda[]> {
    return this.http.get<RecomendacionPrenda[]>(`${this.url}/para-mi`);
  }

  leerPreferencias(): Observable<PreferenciasIA> {
    return this.http.get<PreferenciasIA>(`${this.url}/preferencias`);
  }

  guardarPreferencias(preferencias: PreferenciasIA): Observable<PreferenciasIA> {
    return this.http.put<PreferenciasIA>(`${this.url}/preferencias`, preferencias);
  }

  listarFavoritos(): Observable<CatalogoPrendaItem[]> {
    return this.http.get<CatalogoPrendaItem[]>(`${this.url}/favoritos`);
  }

  guardarFavorito(id: number): Observable<CatalogoPrendaItem[]> {
    return this.http.put<CatalogoPrendaItem[]>(`${this.url}/favoritos/${id}`, {});
  }

  quitarFavorito(id: number): Observable<CatalogoPrendaItem[]> {
    return this.http.delete<CatalogoPrendaItem[]>(`${this.url}/favoritos/${id}`);
  }
}
