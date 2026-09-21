import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarDireccionRequest,
  ActualizarPerfilRequest,
  CambiarPasswordRequest,
  CrearDireccionRequest,
  DireccionResponse,
  ListaDireccionesResponse,
  MensajeResponse,
  PerfilResponse,
} from '../models/perfil.models';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly perfilUrl = `${API_BASE_URL}/api/v1/perfil`;

  obtenerPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(this.perfilUrl);
  }

  actualizarPerfil(
    request: ActualizarPerfilRequest
  ): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(this.perfilUrl, request);
  }

  cambiarPassword(request: CambiarPasswordRequest): Observable<MensajeResponse> {
    return this.http.put<MensajeResponse>(`${this.perfilUrl}/password`, request);
  }

  listarDirecciones(): Observable<ListaDireccionesResponse> {
    return this.http.get<ListaDireccionesResponse>(`${this.perfilUrl}/direcciones`);
  }

  crearDireccion(request: CrearDireccionRequest): Observable<DireccionResponse> {
    return this.http.post<DireccionResponse>(
      `${this.perfilUrl}/direcciones`,
      request
    );
  }

  actualizarDireccion(
    direccionId: number,
    request: ActualizarDireccionRequest
  ): Observable<DireccionResponse> {
    return this.http.put<DireccionResponse>(
      `${this.perfilUrl}/direcciones/${direccionId}`,
      request
    );
  }

  desactivarDireccion(direccionId: number): Observable<MensajeResponse> {
    return this.http.delete<MensajeResponse>(
      `${this.perfilUrl}/direcciones/${direccionId}`
    );
  }
}
