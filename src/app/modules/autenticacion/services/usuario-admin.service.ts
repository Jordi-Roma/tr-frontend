import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarUsuarioRequest,
  CrearUsuarioRequest,
  MensajeResponse,
  UsuarioAdminResponse,
} from '../models/usuario-admin.models';

@Injectable({
  providedIn: 'root',
})
export class UsuarioAdminService {
  private readonly http = inject(HttpClient);
  private readonly usuariosUrl = `${API_BASE_URL}/api/v1/usuarios`;

  listarUsuarios(): Observable<UsuarioAdminResponse[]> {
    return this.http.get<UsuarioAdminResponse[]>(this.usuariosUrl);
  }

  crearUsuario(request: CrearUsuarioRequest): Observable<UsuarioAdminResponse> {
    return this.http.post<UsuarioAdminResponse>(this.usuariosUrl, request);
  }

  obtenerUsuario(usuarioId: number): Observable<UsuarioAdminResponse> {
    return this.http.get<UsuarioAdminResponse>(`${this.usuariosUrl}/${usuarioId}`);
  }

  actualizarUsuario(
    usuarioId: number,
    request: ActualizarUsuarioRequest
  ): Observable<UsuarioAdminResponse> {
    return this.http.put<UsuarioAdminResponse>(
      `${this.usuariosUrl}/${usuarioId}`,
      request
    );
  }

  desactivarUsuario(usuarioId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.usuariosUrl}/${usuarioId}/desactivar`,
      {}
    );
  }

  activarUsuario(usuarioId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.usuariosUrl}/${usuarioId}/activar`,
      {}
    );
  }

  asignarRol(usuarioId: number, rolId: number): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(
      `${this.usuariosUrl}/${usuarioId}/roles/${rolId}`,
      {}
    );
  }

  desactivarRol(usuarioId: number, rolId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.usuariosUrl}/${usuarioId}/roles/${rolId}/desactivar`,
      {}
    );
  }

  activarRol(usuarioId: number, rolId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.usuariosUrl}/${usuarioId}/roles/${rolId}/activar`,
      {}
    );
  }
}
