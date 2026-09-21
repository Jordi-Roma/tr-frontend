import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);

  health() {
    return this.http.get<{ status: string; service: string }>(
      `${API_BASE_URL}/api/v1/health`
    );
  }
}
