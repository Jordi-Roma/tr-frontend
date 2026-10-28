import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ReintentoComercialService } from '../../../core/services/reintento-comercial.service';
import { CrearVentaPresencialRequest, VentaPresencialResponse } from '../models/inventario.models';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly operaciones = inject(ReintentoComercialService);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/ventas-presenciales`;

  listarVentas(sucursalId?: number | null): Observable<VentaPresencialResponse[]> {
    let params = new HttpParams();
    if (sucursalId !== undefined && sucursalId !== null) {
      params = params.set('sucursal_id', String(sucursalId));
    }
    return this.http.get<VentaPresencialResponse[]>(this.apiUrl, { params });
  }

  crearVenta(request: CrearVentaPresencialRequest): Observable<VentaPresencialResponse> {
    return this.operaciones.post<VentaPresencialResponse>(this.apiUrl, request);
  }

  opciones(sucursalId: number | null = null, q = ''): Observable<OpcionesVenta> {
    let params = new HttpParams().set('q', q);
    if (sucursalId !== null) params = params.set('sucursal_id', sucursalId);
    return this.http.get<OpcionesVenta>(`${this.apiUrl}/opciones`, { params });
  }

  clientes(q = ''): Observable<ClienteVenta[]> {
    return this.http.get<ClienteVenta[]>(`${this.apiUrl}/clientes-opciones`, { params: { q } });
  }

  descargarNota(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/nota.pdf`, { responseType: 'blob' });
  }

  enviarNota(id: number): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/${id}/nota/correo`, {});
  }

  configuracion(): Observable<{
    nombre: string;
    comprobante_config: { condiciones?: string; logo_archivo?: string };
  }> {
    return this.http.get<{
      nombre: string;
      comprobante_config: { condiciones?: string; logo_archivo?: string };
    }>(`${this.apiUrl}/configuracion-comprobante`);
  }

  guardarCondiciones(condiciones: string): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${this.apiUrl}/configuracion-comprobante`, {
      condiciones,
    });
  }

  subirLogo(archivo: File): Observable<{ mensaje: string }> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/configuracion-comprobante/logo`,
      datos,
    );
  }
}

export interface VarianteVenta {
  id: number;
  producto_nombre: string;
  talla_nombre: string;
  color_nombre: string;
  sku: string;
  stock: number;
  precio: number | string | null;
}
export interface ClienteVenta {
  id: number;
  nombre: string;
  correo: string;
}
export interface OpcionesVenta {
  sucursales: { id: number; nombre: string }[];
  variantes: VarianteVenta[];
  puede_descontar: boolean;
  sucursal_asignada: number | null;
}
