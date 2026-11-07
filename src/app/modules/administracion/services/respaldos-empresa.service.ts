import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ConfiguracionRespaldos,
  PreviaRespaldo,
  ProgramacionRespaldo,
  Respaldo,
} from '../models/saas.models';

@Service()
export class RespaldosEmpresaService {
  private readonly http = inject(HttpClient);
  private readonly base = API_BASE_URL + '/api/v1/respaldos';
  listar() {
    return this.http.get<Respaldo[]>(this.base);
  }
  estadoEmpresa() {
    return this.http.get<{ empresa_estado: string }>(API_BASE_URL + '/api/v1/mi-empresa/plan');
  }
  crear() {
    return this.http.post<Respaldo>(this.base, {});
  }
  programacion() {
    return this.http.get<ConfiguracionRespaldos>(this.base + '/programacion');
  }
  guardarProgramacion(datos: ProgramacionRespaldo) {
    return this.http.put<ProgramacionRespaldo>(this.base + '/programacion', datos);
  }
  previsualizar(id: string) {
    return this.http.post<PreviaRespaldo>(`${this.base}/${id}/previsualizar`, {});
  }
  restaurar(id: string, confirmacion: string) {
    return this.http.post<{ estado: string; destino: string }>(`${this.base}/${id}/restaurar`, {
      confirmacion,
    });
  }
  eliminar(id: string) {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }
}
