import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ActualizarProveedorRequest,
  CuentaProveedor, CrearCuentaProveedor, ProductoVinculable,
  CrearProveedorRequest,
  MensajeResponse,
  ProveedorEntregaPanel,
  ProveedorPerfil,
  ProveedorProductoPanel,
  ProveedorResponse,
  ProveedorStockPanel,
} from '../models/proveedor.models';

@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly proveedoresUrl = `${API_BASE_URL}/api/v1/proveedores`;
  private readonly proveedorPanelUrl = `${API_BASE_URL}/api/v1/proveedor-panel`;

  opcionesInventario(): Observable<Pick<ProveedorResponse, 'id' | 'nombre' | 'activo'>[]> {
    return this.http.get<Pick<ProveedorResponse, 'id' | 'nombre' | 'activo'>[]>(`${API_BASE_URL}/api/v1/inventario/proveedores-opciones`);
  }

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

  vincularUsuario(proveedorId: number, usuarioId: number): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(`${this.proveedoresUrl}/${proveedorId}/usuarios`, {
      usuario_id: usuarioId,
    });
  }

  desvincularUsuario(proveedorId: number, usuarioId: number): Observable<ProveedorResponse> {
    return this.http.delete<ProveedorResponse>(`${this.proveedoresUrl}/${proveedorId}/usuarios/${usuarioId}`);
  }

  cuentasDisponibles(): Observable<CuentaProveedor[]> {
    return this.http.get<CuentaProveedor[]>(`${this.proveedoresUrl}/cuentas-disponibles`);
  }
  crearCuenta(proveedorId: number, datos: CrearCuentaProveedor): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(`${this.proveedoresUrl}/${proveedorId}/crear-usuario`, datos);
  }
  productosDisponibles(): Observable<ProductoVinculable[]> {
    return this.http.get<ProductoVinculable[]>(`${this.proveedoresUrl}/productos-disponibles`);
  }
  productosVinculados(proveedorId: number): Observable<ProveedorProductoPanel[]> {
    return this.http.get<ProveedorProductoPanel[]>(`${this.proveedoresUrl}/${proveedorId}/productos`);
  }
  vincularProducto(proveedorId: number, productoId: number): Observable<ProveedorProductoPanel[]> {
    return this.http.post<ProveedorProductoPanel[]>(`${this.proveedoresUrl}/${proveedorId}/productos`, { producto_id: productoId });
  }
  desvincularProducto(proveedorId: number, productoId: number): Observable<ProveedorProductoPanel[]> {
    return this.http.delete<ProveedorProductoPanel[]>(`${this.proveedoresUrl}/${proveedorId}/productos/${productoId}`);
  }

  obtenerPerfilPanel(): Observable<ProveedorPerfil> {
    return this.http.get<ProveedorPerfil>(`${this.proveedorPanelUrl}/perfil`);
  }

  listarProductosPanel(): Observable<ProveedorProductoPanel[]> {
    return this.http.get<ProveedorProductoPanel[]>(`${this.proveedorPanelUrl}/productos`);
  }

  listarStockPanel(): Observable<ProveedorStockPanel[]> {
    return this.http.get<ProveedorStockPanel[]>(`${this.proveedorPanelUrl}/stock`);
  }

  listarEntregasPanel(): Observable<ProveedorEntregaPanel[]> {
    return this.http.get<ProveedorEntregaPanel[]>(`${this.proveedorPanelUrl}/entregas`);
  }
}
