export const CUOTAS = ['usuarios', 'empleados', 'productos', 'sucursales'] as const;
export const FUNCIONES = ['recomendaciones', 'asistente', 'reportes', 'vestidor'] as const;
export type Cuota = (typeof CUOTAS)[number];
export type Funcion = (typeof FUNCIONES)[number];
export type Limites = Partial<Record<Cuota, number>>;
export type Funciones = Partial<Record<Funcion, boolean>>;
export interface Plan {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  limites: Limites;
  funciones: Funciones;
}
export type PlanAlta = Omit<Plan, 'id' | 'activo'>;
export interface Empresa {
  id: number;
  codigo: string;
  nombre: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA';
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
export interface EventoPlataforma {
  id: number;
  actor_id: number;
  empresa_id: number | null;
  accion: string;
  recurso_id: string | null;
  fecha: string;
}
