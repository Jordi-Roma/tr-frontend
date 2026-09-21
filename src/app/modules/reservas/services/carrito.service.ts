import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarCarritoItemRequest,
  AgregarCarritoItemRequest,
  CarritoResponse,
} from '../models/carrito.models';

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/carrito`;

  obtenerCarrito(): Observable<CarritoResponse> {
    return this.http.get<CarritoResponse>(this.apiUrl);
  }

  agregarItem(request: AgregarCarritoItemRequest): Observable<CarritoResponse> {
    return this.http.post<CarritoResponse>(`${this.apiUrl}/items`, request);
  }

  actualizarItem(id: number, request: ActualizarCarritoItemRequest): Observable<CarritoResponse> {
    return this.http.put<CarritoResponse>(`${this.apiUrl}/items/${id}`, request);
  }

  eliminarItem(id: number): Observable<CarritoResponse> {
    return this.http.delete<CarritoResponse>(`${this.apiUrl}/items/${id}`);
  }

  vaciar(): Observable<CarritoResponse> {
    return this.http.delete<CarritoResponse>(this.apiUrl);
  }
}
