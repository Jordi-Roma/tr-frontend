import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api.config';
import { BitacoraDetalle, BitacoraFiltros, BitacoraListResponse } from '../models/bitacora.models';
@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly http = inject(HttpClient);
  private url(plataforma: boolean) {
    return API_BASE_URL + '/api/v1/' + (plataforma ? 'saas/' : '') + 'bitacora';
  }
  listarBitacora(filtros: BitacoraFiltros, plataforma = false) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filtros))
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    return this.http.get<BitacoraListResponse>(this.url(plataforma), { params });
  }
  obtenerRegistro(id: number, plataforma = false) {
    return this.http.get<BitacoraDetalle>(this.url(plataforma) + '/' + id);
  }
  opciones(plataforma = false) {
    return this.http.get<{ modulos: string[]; actores: { id: number; nombre: string }[] }>(
      this.url(plataforma) + '/opciones',
    );
  }
}
