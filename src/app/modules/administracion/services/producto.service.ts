import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarProductoRequest,
  CrearProductoRequest,
  ProductoResponse,
} from '../models/producto.models';
import { MensajeResponse } from '../models/catalogo.models';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/productos`;

  listarProductos(): Observable<ProductoResponse[]> {
    return this.http.get<ProductoResponse[]>(this.apiUrl);
  }

  obtenerProducto(id: number): Observable<ProductoResponse> {
    return this.http.get<ProductoResponse>(`${this.apiUrl}/${id}`);
  }

  crearProducto(request: CrearProductoRequest): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(this.apiUrl, request);
  }

  actualizarProducto(
    id: number,
    request: ActualizarProductoRequest
  ): Observable<ProductoResponse> {
    return this.http.put<ProductoResponse>(`${this.apiUrl}/${id}`, request);
  }

  desactivarProducto(id: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiUrl}/${id}/desactivar`, {});
  }

  activarProducto(id: number): Observable<ProductoResponse> {
    return this.http.patch<ProductoResponse>(`${this.apiUrl}/${id}/activar`, {});
  }
}
