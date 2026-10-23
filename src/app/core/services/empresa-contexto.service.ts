import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CambioContextoService } from './cambio-contexto.service';

export interface EmpresaPublica {
  id: number;
  codigo: string;
  nombre: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA';
}

const CODIGO_KEY = 'stylear_empresa_codigo_v1';

@Service()
export class EmpresaContextoService {
  // Resolving a public code must not reuse the token of another company.
  private readonly publico = new HttpClient(inject(HttpBackend));
  private readonly cambios = inject(CambioContextoService);
  private readonly seleccion = signal<EmpresaPublica | null>(null);
  readonly empresa = this.seleccion.asReadonly();

  codigoRecordado(): string | null {
    return localStorage.getItem(CODIGO_KEY);
  }

  listar(): Observable<EmpresaPublica[]> {
    return this.publico.get<EmpresaPublica[]>(`${API_BASE_URL}/api/v1/empresas/publicas`);
  }

  resolver(codigo: string): Observable<EmpresaPublica> {
    return this.publico.get<EmpresaPublica>(
      `${API_BASE_URL}/api/v1/empresas/publica/${encodeURIComponent(codigo.trim().toLowerCase())}`,
    );
  }

  seleccionar(empresa: EmpresaPublica): void {
    if (empresa.estado === 'CANCELADA') throw new Error('Empresa no disponible.');
    this.cambios.invalidar();
    this.seleccion.set(empresa);
    localStorage.setItem(CODIGO_KEY, empresa.codigo);
  }

  restaurar(codigo: string): Observable<EmpresaPublica> {
    return this.resolver(codigo).pipe(tap((empresa) => this.seleccionar(empresa)));
  }

  limpiar(): void {
    this.cambios.invalidar();
    this.seleccion.set(null);
    localStorage.removeItem(CODIGO_KEY);
  }
}
