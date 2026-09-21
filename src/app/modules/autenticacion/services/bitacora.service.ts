import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  BitacoraDetalle,
  BitacoraFiltros,
  BitacoraListResponse,
} from '../models/bitacora.models';

@Injectable({
  providedIn: 'root',
})
export class BitacoraService {
  private readonly http = inject(HttpClient);
  private readonly bitacoraUrl = `${API_BASE_URL}/api/v1/bitacora`;

  listarBitacora(filtros: BitacoraFiltros = {}): Observable<BitacoraListResponse> {
    let params = new HttpParams();

    if (filtros.usuario_id !== undefined && filtros.usuario_id !== null) {
      params = params.set('usuario_id', filtros.usuario_id.toString());
    }

    if (filtros.accion && filtros.accion.trim()) {
      params = params.set('accion', filtros.accion.trim());
    }

    if (filtros.modulo && filtros.modulo.trim()) {
      params = params.set('modulo', filtros.modulo.trim());
    }

    if (filtros.resultado && filtros.resultado.trim()) {
      params = params.set('resultado', filtros.resultado.trim());
    }

    if (filtros.fecha_desde && filtros.fecha_desde.trim()) {
      params = params.set('fecha_desde', filtros.fecha_desde.trim());
    }

    if (filtros.fecha_hasta && filtros.fecha_hasta.trim()) {
      params = params.set('fecha_hasta', filtros.fecha_hasta.trim());
    }

    if (filtros.pagina && filtros.pagina > 0) {
      params = params.set('pagina', filtros.pagina.toString());
    }

    if (filtros.por_pagina && filtros.por_pagina > 0) {
      params = params.set('por_pagina', filtros.por_pagina.toString());
    }

    return this.http.get<BitacoraListResponse>(this.bitacoraUrl, { params });
  }

  obtenerRegistro(id: number): Observable<BitacoraDetalle> {
    return this.http.get<BitacoraDetalle>(`${this.bitacoraUrl}/${id}`);
  }
}
