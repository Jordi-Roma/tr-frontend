export interface FuncionPlan {
  incluida: boolean;
  habilitada: boolean;
  motivo: string | null;
}
export interface CupoPlan {
  limite: number | null;
  uso: number;
  disponibles: number | null;
  agotado: boolean;
  motivo: string | null;
}
export interface CatalogoPlan {
  funciones: {
    clave: string;
    nombre: string;
    modulo: string;
    descripcion: string;
    dependencias: string[];
    requiere_alguna: string[];
    tipo: string;
    esencial: boolean;
  }[];
  limites: {
    clave: string;
    nombre: string;
    unidad: string;
    minimo: number;
    tipo: string;
    ausencia: string;
  }[];
  esenciales: string[];
  incluidas_sin_diferenciar_plan: string[];
  nota_voz: string;
}
export interface CapacidadesPlan {
  empresa_id: number;
  plan_codigo: string | null;
  plan: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
    revision: number | null;
  };
  suscripcion: {
    estado: string | null;
    fecha_inicio: string | null;
    fecha_vencimiento: string | null;
  };
  operaciones_habilitadas: boolean;
  funciones: Record<string, FuncionPlan>;
  limites: Record<string, number | null>;
  uso: Record<string, number>;
  cupos: Record<string, CupoPlan>;
  catalogo: CatalogoPlan;
}
