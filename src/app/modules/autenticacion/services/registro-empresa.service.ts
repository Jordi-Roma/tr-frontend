import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Funciones, Limites } from '../../administracion/models/saas.models';

export interface PlanRegistro {
  id: number;
  nombre: string;
  limites: Limites;
  funciones: Funciones;
}
export interface RegistroEmpresa {
  empresa_codigo: string;
  empresa_nombre: string;
  plan_id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  password: string;
  confirmar_password: string;
}
export interface ResultadoRegistroEmpresa {
  empresa: { id: number; codigo: string; nombre: string; estado: string };
  mensaje: string;
}

@Service()
export class RegistroEmpresaService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly base = `${API_BASE_URL}/api/v1/empresas/registro`;

  planes() {
    return this.http.get<PlanRegistro[]>(`${this.base}/planes`);
  }

  registrar(datos: RegistroEmpresa, clave_solicitud: string) {
    // Es un alta pública independiente de la empresa/sesión actualmente abierta.
    return this.http.post<ResultadoRegistroEmpresa>(this.base, { ...datos, clave_solicitud });
  }
}
