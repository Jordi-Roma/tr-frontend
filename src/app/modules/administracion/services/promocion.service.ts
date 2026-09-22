import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PromocionRequest, PromocionResponse } from '../models/promocion.models';

@Injectable({
  providedIn: 'root',
})
export class PromocionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/promociones`;

  listarPromociones(): Observable<PromocionResponse[]> {
    return this.http.get<PromocionResponse[]>(this.apiUrl);
  }

  crearPromocion(request: PromocionRequest): Observable<PromocionResponse> {
    return this.http.post<PromocionResponse>(this.apiUrl, request);
  }

  actualizarPromocion(id: number, request: PromocionRequest): Observable<PromocionResponse> {
    return this.http.put<PromocionResponse>(`${this.apiUrl}/${id}`, request);
  }

  activarPromocion(id: number): Observable<PromocionResponse> {
    return this.http.patch<PromocionResponse>(`${this.apiUrl}/${id}/activar`, {});
  }

  desactivarPromocion(id: number): Observable<PromocionResponse> {
    return this.http.patch<PromocionResponse>(`${this.apiUrl}/${id}/desactivar`, {});
  }
}
