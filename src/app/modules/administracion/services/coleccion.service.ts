import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarColeccionRequest,
  ColeccionResponse,
  CrearColeccionRequest,
  MensajeResponse,
} from '../models/catalogo.models';

@Injectable({
  providedIn: 'root',
})
export class ColeccionService {
  private readonly http = inject(HttpClient);
  private readonly coleccionesUrl = `${API_BASE_URL}/api/v1/colecciones`;

  listarColecciones(): Observable<ColeccionResponse[]> {
    return this.http.get<ColeccionResponse[]>(this.coleccionesUrl);
  }

  obtenerColeccion(coleccionId: number): Observable<ColeccionResponse> {
    return this.http.get<ColeccionResponse>(`${this.coleccionesUrl}/${coleccionId}`);
  }

  crearColeccion(request: CrearColeccionRequest): Observable<ColeccionResponse> {
    return this.http.post<ColeccionResponse>(this.coleccionesUrl, request);
  }

  actualizarColeccion(
    coleccionId: number,
    request: ActualizarColeccionRequest
  ): Observable<ColeccionResponse> {
    return this.http.put<ColeccionResponse>(
      `${this.coleccionesUrl}/${coleccionId}`,
      request
    );
  }

  desactivarColeccion(coleccionId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.coleccionesUrl}/${coleccionId}/desactivar`,
      {}
    );
  }

  activarColeccion(coleccionId: number): Observable<ColeccionResponse> {
    return this.http.patch<ColeccionResponse>(
      `${this.coleccionesUrl}/${coleccionId}/activar`,
      {}
    );
  }
}
