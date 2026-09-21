import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Interpretacion, ReporteCatalogo, ReporteFiltros, ReporteResultado } from '../models/reporte.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/v1/reportes`;

  catalogo() { return this.http.get<ReporteCatalogo>(`${this.base}/catalogo`); }
  interpretar(texto: string) { return this.http.post<Interpretacion>(`${this.base}/interpretar`, { texto }); }
  generar(filtros: ReporteFiltros) { return this.http.post<ReporteResultado>(`${this.base}/generar`, filtros); }
  exportar(filtros: ReporteFiltros, formato: 'pdf' | 'excel') {
    return this.http.post(`${this.base}/exportar/${formato}`, filtros, { responseType: 'blob' });
  }
}
