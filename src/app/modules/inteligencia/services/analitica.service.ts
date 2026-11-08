import { inject, Service } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, from, mergeMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  EstadoAnalitica,
  FiltrosAnalitica,
  PrediccionesAnalitica,
  SegmentosAnalitica,
  SolicitudReporteAnalitica,
  InterpretacionAnalitica,
  OrigenAnalitica,
} from '../models/analitica.models';

@Service()
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/v1/reportes/analitica`;
  estado() {
    return this.http.get<EstadoAnalitica>(`${this.base}/estado`);
  }
  predicciones(params: FiltrosAnalitica) {
    return this.http.get<PrediccionesAnalitica>(`${this.base}/predicciones`, { params });
  }
  segmentos(params: FiltrosAnalitica) {
    return this.http.get<SegmentosAnalitica>(`${this.base}/segmentos`, { params });
  }
  interpretar(texto: string, origen: OrigenAnalitica, origen_entrada: 'TEXTO' | 'VOZ') {
    return this.http.post<InterpretacionAnalitica>(`${this.base}/interpretar`, {
      texto,
      origen,
      origen_entrada,
    });
  }
  exportar(solicitud: SolicitudReporteAnalitica, formato: 'pdf' | 'excel') {
    return this.http
      .post(`${this.base}/exportar/${formato}`, solicitud, { responseType: 'blob' })
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
            return from(error.error.text()).pipe(
              mergeMap((texto) => {
                let cuerpo: unknown;
                try {
                  cuerpo = JSON.parse(texto);
                } catch {
                  return throwError(() => error);
                }
                return throwError(() => ({ error: cuerpo }));
              }),
            );
          }
          return throwError(() => error);
        }),
      );
  }
}
