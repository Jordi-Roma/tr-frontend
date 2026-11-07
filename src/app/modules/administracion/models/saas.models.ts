export const CUOTAS = ['usuarios', 'empleados', 'productos', 'sucursales'] as const;
export const FUNCIONES = ['recomendaciones', 'asistente', 'reportes', 'vestidor'] as const;
export type Cuota = (typeof CUOTAS)[number];
export type Funcion = (typeof FUNCIONES)[number];
export type Limites = Record<string, number>;
export type Funciones = Record<string, boolean>;
export interface Plan {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  publico: boolean;
  limites: Limites;
  funciones: Funciones;
  descripcion: string;
  condiciones: string;
  precio: string | number;
  moneda: string;
  revision: number;
}
export type PlanAlta = Omit<Plan, 'id' | 'activo' | 'revision'>;
export type PlanCambio = Partial<PlanAlta> & { activo?: boolean };
export interface ImpactoPlan {
  total_empresas: number;
  empresas: {
    id: number;
    nombre: string;
    estado: string;
    uso: Record<string, number>;
    excesos: Record<string, { uso: number; limite: number }>;
    reportes_a_pausar: number[];
    restablecer_horario_respaldo: boolean;
    operaciones_bloqueadas_por_desactivar_plan: boolean;
  }[];
}
export interface PreviaPlan {
  plan_actual: Plan;
  propuesta: PlanAlta & { activo: boolean };
  impacto: ImpactoPlan;
  token_previsualizacion: string;
}
export interface HistorialPlan {
  id: number;
  actor_id: number;
  fecha: string;
  antes: Plan | null;
  despues: Plan;
  impacto: Partial<ImpactoPlan>;
}
export interface ResumenPlan {
  id: number;
  codigo: string;
  nombre: string;
  empresas: number;
  vigentes: number;
  no_vigentes: number;
}
export interface Suscripcion {
  id: number;
  plan_id: number;
  plan_nombre: string;
  plan_codigo: string;
  estado: string;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  fecha_creacion: string;
}
export interface EmpresasPagina {
  empresas: Empresa[];
  total: number;
  pagina: number;
  tamano: number;
}
export interface Empresa {
  id: number;
  codigo: string;
  nombre: string;
  estado: 'PENDIENTE' | 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA';
  correo_contacto: string | null;
  responsable: string | null;
  plan_id: number | null;
  plan_nombre: string | null;
  plan_codigo: string | null;
  suscripcion_id: number | null;
  suscripcion_estado: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
}
export interface EmpresaAlta {
  codigo: string;
  nombre: string;
  plan_id: number;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  administrador: {
    nombre: string;
    apellido: string;
    username: string;
    correo: string;
    password: string;
  };
}
export interface MiPlan {
  empresa_id: number;
  empresa_codigo: string;
  empresa_nombre: string;
  empresa_estado: string;
  plan_id: number | null;
  plan_codigo: string | null;
  plan_nombre: string | null;
  plan_activo: boolean | null;
  suscripcion_estado: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  limites: Limites | null;
  funciones: Funciones | null;
  uso: Record<Cuota, number>;
  operaciones_habilitadas: boolean;
}
export interface Respaldo {
  id: string;
  tipo: 'GLOBAL' | 'EMPRESA';
  empresa_id: number | null;
  fecha: string;
  vence_en: string;
  bytes: number;
  estado: 'DISPONIBLE' | 'ELIMINADO';
  origen: 'MANUAL' | 'AUTOMATICO' | 'PRE_RESTAURACION';
}
export interface PreviaRespaldo {
  id: string;
  tipo: 'GLOBAL' | 'EMPRESA';
  empresa_id: number | null;
  empresa_codigo?: string;
  versiones: string[];
  archivos: number;
  conteos?: Record<string, number>;
  conteos_actuales?: Record<string, number>;
  confirmacion: string;
  destino: string;
}
export interface PoliticaRespaldos {
  manuales_semana: number;
  retencion_dias: number;
  frecuencia_dias: number | null;
  horario_editable: boolean;
  manuales_habilitados: boolean;
}
export interface ProgramacionRespaldo {
  activa: boolean;
  fecha_inicio: string;
  hora_local: string;
  zona_horaria: string;
  ultimo_respaldo?: string | null;
  actualizada_en?: string;
}
export interface ConfiguracionRespaldos {
  politica: PoliticaRespaldos;
  programacion: ProgramacionRespaldo;
}
export interface EventoPlataforma {
  id: number;
  actor_id: number;
  empresa_id: number | null;
  accion: string;
  recurso_id: string | null;
  fecha: string;
}
