import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarVarianteRequest,
  CrearVarianteRequest,
  AsignarPrecioRequest,
  VarianteResponse,
} from '../models/variante.models';
import { MensajeResponse } from '../models/catalogo.models';

@Injectable({
  providedIn: 'root',
})
export class VarianteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/variantes`;

  listarVariantes(productoId?: number): Observable<VarianteResponse[]> {
    const url = productoId ? `${this.apiUrl}?producto_id=${productoId}` : this.apiUrl;
    return this.http.get<VarianteResponse[]>(url);
  }

  obtenerVariante(id: number): Observable<VarianteResponse> {
    return this.http.get<VarianteResponse>(`${this.apiUrl}/${id}`);
  }

  crearVariante(request: CrearVarianteRequest): Observable<VarianteResponse> {
    return this.http.post<VarianteResponse>(this.apiUrl, request);
  }

  actualizarVariante(
    id: number,
    request: ActualizarVarianteRequest
  ): Observable<VarianteResponse> {
    return this.http.put<VarianteResponse>(`${this.apiUrl}/${id}`, request);
  }

  desactivarVariante(id: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiUrl}/${id}/desactivar`, {});
  }

  activarVariante(id: number): Observable<VarianteResponse> {
    return this.http.patch<VarianteResponse>(`${this.apiUrl}/${id}/activar`, {});
  }
  
  asignarPrecio(id: number, request: AsignarPrecioRequest): Observable<VarianteResponse> {
    return this.http.post<VarianteResponse>(`${this.apiUrl}/${id}/precios`, request);
  }
}
