import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AsistenteChatRequest, AsistenteChatResponse } from '../models/asistente.models';

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/api/v1/asistente`;

  chat(request: AsistenteChatRequest): Observable<AsistenteChatResponse> {
    return this.http.post<AsistenteChatResponse>(`${this.url}/chat`, request);
  }
}

