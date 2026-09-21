import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarProveedorRequest,
  CrearProveedorRequest,
  MensajeResponse,
  ProveedorResponse,
} from '../models/proveedor.models';

@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly proveedoresUrl = `${API_BASE_URL}/api/v1/proveedores`;

  listarProveedores(): Observable<ProveedorResponse[]> {
    return this.http.get<ProveedorResponse[]>(this.proveedoresUrl);
  }

  obtenerProveedor(proveedorId: number): Observable<ProveedorResponse> {
    return this.http.get<ProveedorResponse>(`${this.proveedoresUrl}/${proveedorId}`);
  }

  crearProveedor(request: CrearProveedorRequest): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(this.proveedoresUrl, request);
  }

  actualizarProveedor(
    proveedorId: number,
    request: ActualizarProveedorRequest
  ): Observable<ProveedorResponse> {
    return this.http.put<ProveedorResponse>(
      `${this.proveedoresUrl}/${proveedorId}`,
      request
    );
  }

  desactivarProveedor(proveedorId: number): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(
      `${this.proveedoresUrl}/${proveedorId}/desactivar`,
      {}
    );
  }

  activarProveedor(proveedorId: number): Observable<ProveedorResponse> {
    return this.http.patch<ProveedorResponse>(
      `${this.proveedoresUrl}/${proveedorId}/activar`,
      {}
    );
  }
}
