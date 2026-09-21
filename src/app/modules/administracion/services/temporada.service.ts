import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarTemporadaRequest,
  CrearTemporadaRequest,
  MensajeResponse,
  TemporadaResponse,
} from '../models/catalogo.models';

@Injectable({
  providedIn: 'root',
})
export class TemporadaService {
  private readonly http = inject(HttpClient);
  private readonly temporadasUrl = `${API_BASE_URL}/api/v1/temporadas`;

  listarTemporadas(): Observable<TemporadaResponse[]> {
    return this.http.get<TemporadaResponse[]>(this.temporadasUrl);
  }

  obtenerTemporada(temporadaId: number): Observable<TemporadaResponse> {
    return this.http.get<TemporadaResponse>(`${this.temporadasUrl}/${temporadaId}`);
  }

  crearTemporada(request: CrearTemporadaRequest): Observable<TemporadaResponse> {
    return this.http.post<TemporadaResponse>(this.temporadasUrl, request);
  }

  actualizarTemporada(
    temporadaId: number,
    request: ActualizarTemporadaRequest
  ): Observable<TemporadaResponse> {
    return this.http.put<TemporadaResponse>(
      `${this.temporadasUrl}/${temporadaId}`,
      request
    );
  }

  desactivarTemporada(temporadaId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.temporadasUrl}/${temporadaId}/desactivar`,
      {}
    );
  }

  activarTemporada(temporadaId: number): Observable<TemporadaResponse> {
    return this.http.patch<TemporadaResponse>(
      `${this.temporadasUrl}/${temporadaId}/activar`,
      {}
    );
  }
}
