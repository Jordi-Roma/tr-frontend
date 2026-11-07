import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CambioContextoService } from '../../../core/services/cambio-contexto.service';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AsistenteContexto,
  AsistenteChatRequest,
  AsistenteChatResponse,
} from '../models/asistente.models';

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  constructor() {
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => this.seleccion.set(null));
  }
  readonly seleccion = signal<{ contexto: AsistenteContexto; revision: number } | null>(null);
  abrir(contexto: AsistenteContexto): void {
    this.seleccion.set({ contexto, revision: Date.now() });
  }
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/v1/asistente`;

  chat(request: AsistenteChatRequest): Observable<AsistenteChatResponse> {
    return this.http.post<AsistenteChatResponse>(`${this.url}/chat`, request);
  }
}
