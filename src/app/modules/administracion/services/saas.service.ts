import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  Empresa,
  EmpresaAlta,
  EventoPlataforma,
  MiPlan,
  Plan,
  PlanAlta,
  PreviaRespaldo,
  Respaldo,
  PlanCambio,
  PreviaPlan,
  HistorialPlan,
  ResumenPlan,
  Suscripcion,
  EmpresasPagina,
} from '../models/saas.models';
import { CapacidadesPlan, CatalogoPlan } from '../../../core/models/capacidades-plan.models';

@Service()
export class SaasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/api/v1`;
  empresas() {
    return this.http.get<Empresa[]>(`${this.base}/saas/empresas`);
  }
  planes() {
    return this.http.get<Plan[]>(`${this.base}/saas/planes`);
  }
  crearEmpresa(datos: EmpresaAlta) {
    return this.http.post<Empresa>(`${this.base}/saas/empresas`, datos);
  }
  editarEmpresa(id: number, nombre: string) {
    return this.http.patch<Empresa>(`${this.base}/saas/empresas/${id}`, { nombre });
  }
  estadoEmpresa(id: number, estado: Empresa['estado']) {
    return this.http.patch<Empresa>(`${this.base}/saas/empresas/${id}/estado`, { estado });
  }
  suscribir(id: number, plan_id: number, fecha_inicio: string, fecha_vencimiento: string | null) {
    return this.http.post<unknown>(`${this.base}/saas/empresas/${id}/suscripcion`, {
      plan_id,
      fecha_inicio,
      fecha_vencimiento,
    });
  }
  crearPlan(datos: PlanAlta) {
    return this.http.post<Plan>(`${this.base}/saas/planes`, datos);
  }
  editarPlan(id: number, datos: PlanCambio & { token_previsualizacion: string }) {
    return this.http.put<Plan>(`${this.base}/saas/planes/${id}`, datos);
  }
  catalogoPlanes() {
    return this.http.get<CatalogoPlan>(`${this.base}/saas/planes/catalogo`);
  }
  previsualizarPlan(id: number, datos: PlanCambio) {
    return this.http.post<PreviaPlan>(`${this.base}/saas/planes/${id}/previsualizar`, datos);
  }
  historialPlan(id: number) {
    return this.http.get<HistorialPlan[]>(`${this.base}/saas/planes/${id}/historial`);
  }
  resumenPlanes() {
    return this.http.get<ResumenPlan[]>(`${this.base}/saas/planes/resumen`);
  }
  comparacionPlanes() {
    return this.http.get<{ catalogo: CatalogoPlan; planes: Plan[] }>(
      `${this.base}/saas/planes/comparacion`,
    );
  }
  empresasPorPlan(params: Record<string, string | number>) {
    return this.http.get<EmpresasPagina>(`${this.base}/saas/planes/empresas`, { params });
  }
  suscripciones(id: number) {
    return this.http.get<Suscripcion[]>(`${this.base}/saas/empresas/${id}/suscripciones`);
  }
  capacidadesEmpresa(id: number) {
    return this.http.get<CapacidadesPlan>(`${this.base}/saas/empresas/${id}/plan`);
  }
  miPlan() {
    return this.http.get<MiPlan>(`${this.base}/mi-empresa/plan`);
  }
  eventos() {
    return this.http.get<EventoPlataforma[]>(`${this.base}/saas/eventos`);
  }
  respaldos() {
    return this.http.get<Respaldo[]>(`${this.base}/saas/respaldos`);
  }
  crearRespaldo(empresa_id: number | null) {
    return this.http.post<Respaldo>(`${this.base}/saas/respaldos`, { empresa_id });
  }
  previsualizar(id: string) {
    return this.http.post<PreviaRespaldo>(`${this.base}/saas/respaldos/${id}/previsualizar`, {});
  }
  restaurar(id: string, confirmacion: string) {
    return this.http.post<{ estado: string; destino: string }>(
      `${this.base}/saas/respaldos/${id}/restaurar`,
      { confirmacion },
    );
  }
  eliminarRespaldo(id: string) {
    return this.http.delete<unknown>(`${this.base}/saas/respaldos/${id}`);
  }
  purgar() {
    return this.http.post<{ eliminados: number }>(
      `${this.base}/saas/respaldos/purgar-vencidos`,
      {},
    );
  }
}
