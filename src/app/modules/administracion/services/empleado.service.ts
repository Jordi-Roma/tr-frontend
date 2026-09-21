import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActivarEmpleadoRequest,
  ActualizarEmpleadoRequest,
  AsignarUsuarioEmpleadoRequest,
  EmpleadoResponse,
  MensajeResponse,
} from '../models/empleado.models';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly empleadosUrl = `${API_BASE_URL}/api/v1/empleados`;

  listarEmpleados(): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(this.empleadosUrl);
  }

  obtenerEmpleado(empleadoId: number): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(`${this.empleadosUrl}/${empleadoId}`);
  }

  crearEmpleado(
    request: AsignarUsuarioEmpleadoRequest
  ): Observable<EmpleadoResponse> {
    return this.http.post<EmpleadoResponse>(
      `${this.empleadosUrl}/asignar-usuario`,
      request
    );
  }

  actualizarEmpleado(
    empleadoId: number,
    request: ActualizarEmpleadoRequest
  ): Observable<EmpleadoResponse> {
    return this.http.put<EmpleadoResponse>(
      `${this.empleadosUrl}/${empleadoId}`,
      request
    );
  }

  desactivarEmpleado(empleadoId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.empleadosUrl}/${empleadoId}/desactivar`,
      {}
    );
  }

  activarEmpleado(
    empleadoId: number,
    request: ActivarEmpleadoRequest
  ): Observable<EmpleadoResponse> {
    return this.http.patch<EmpleadoResponse>(
      `${this.empleadosUrl}/${empleadoId}/activar`,
      request
    );
  }
}
