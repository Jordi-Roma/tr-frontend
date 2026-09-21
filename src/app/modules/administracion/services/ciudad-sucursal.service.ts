import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarCiudadRequest,
  ActualizarSucursalRequest,
  CiudadResponse,
  CrearCiudadRequest,
  CrearSucursalRequest,
  MensajeResponse,
  SucursalResponse,
} from '../models/ciudad-sucursal.models';

@Injectable({
  providedIn: 'root',
})
export class CiudadSucursalService {
  private readonly http = inject(HttpClient);
  private readonly ciudadesUrl = `${API_BASE_URL}/api/v1/ciudades`;
  private readonly sucursalesUrl = `${API_BASE_URL}/api/v1/sucursales`;

  listarCiudades(): Observable<CiudadResponse[]> {
    return this.http.get<CiudadResponse[]>(this.ciudadesUrl);
  }

  obtenerCiudad(ciudadId: number): Observable<CiudadResponse> {
    return this.http.get<CiudadResponse>(`${this.ciudadesUrl}/${ciudadId}`);
  }

  crearCiudad(request: CrearCiudadRequest): Observable<CiudadResponse> {
    return this.http.post<CiudadResponse>(this.ciudadesUrl, request);
  }

  actualizarCiudad(
    ciudadId: number,
    request: ActualizarCiudadRequest
  ): Observable<CiudadResponse> {
    return this.http.put<CiudadResponse>(
      `${this.ciudadesUrl}/${ciudadId}`,
      request
    );
  }

  desactivarCiudad(ciudadId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.ciudadesUrl}/${ciudadId}/desactivar`,
      {}
    );
  }

  activarCiudad(ciudadId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.ciudadesUrl}/${ciudadId}/activar`,
      {}
    );
  }

  listarSucursales(): Observable<SucursalResponse[]> {
    return this.http.get<SucursalResponse[]>(this.sucursalesUrl);
  }

  obtenerSucursal(sucursalId: number): Observable<SucursalResponse> {
    return this.http.get<SucursalResponse>(
      `${this.sucursalesUrl}/${sucursalId}`
    );
  }

  crearSucursal(request: CrearSucursalRequest): Observable<SucursalResponse> {
    return this.http.post<SucursalResponse>(this.sucursalesUrl, request);
  }

  actualizarSucursal(
    sucursalId: number,
    request: ActualizarSucursalRequest
  ): Observable<SucursalResponse> {
    return this.http.put<SucursalResponse>(
      `${this.sucursalesUrl}/${sucursalId}`,
      request
    );
  }

  desactivarSucursal(sucursalId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.sucursalesUrl}/${sucursalId}/desactivar`,
      {}
    );
  }

  activarSucursal(sucursalId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.sucursalesUrl}/${sucursalId}/activar`,
      {}
    );
  }
}
