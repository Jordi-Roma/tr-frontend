export type OrigenAnalitica = 'OFICIAL' | 'DEMOSTRACION';
export interface SucursalAnalitica {
  id: number;
  nombre: string;
  datos_disponibles: boolean;
}
export interface FuenteAnalitica {
  origen: OrigenAnalitica;
  estado: string;
  advertencia: string;
  evaluado_en: string | null;
  fuente_datos: string | null;
  sucursales: SucursalAnalitica[];
  resumen_historial?: Record<string, number>;
}
export interface EstadoAnalitica {
  fuentes: FuenteAnalitica[];
  segmentacion_permitida: boolean;
  alcance: string;
}
export interface SerieAnalitica {
  fecha_corte: string;
  unidades_reales: number;
  unidades_predichas: number;
  referencia_semana_anterior: number;
}
export interface FilaPrediccion extends SerieAnalitica {
  sucursal_id: number;
  sucursal: string;
  producto_id: string;
  objetivo_hasta: string;
}
export interface BaseAnalitica {
  origen: OrigenAnalitica;
  estado: string;
  advertencia: string;
  pagina: number;
  tamano: number;
  total_filas: number;
  sin_datos: boolean;
  dataset_id?: string;
}
export interface PrediccionesAnalitica extends BaseAnalitica {
  filas: FilaPrediccion[];
  serie: SerieAnalitica[];
  productos: string[];
  entrenado_en?: string;
  metricas: { muestras: number; mae: number; rmse: number; mae_referencia: number } | null;
}
export interface PerfilAnalitica {
  grupo: number;
  nombre: string;
  clientes: number;
  proporcion: number;
  descripcion: string;
  recencia_media_dias: number;
  frecuencia_media_compras: number;
  gasto_medio_centavos: number;
}
export interface SegmentosAnalitica extends BaseAnalitica {
  perfiles: PerfilAnalitica[];
  fecha_corte?: string;
  ventana_dias?: number;
  clientes_sin_compras_ventana?: number;
  filas: {
    cliente_id: string;
    grupo: number;
    recencia_dias: number;
    frecuencia_compras: number;
    gasto_centavos: number;
  }[];
  metricas: {
    silhouette: number;
    ari_medio: number;
    grupos: number;
    clientes_analizados: number;
    evaluacion: string;
  } | null;
}
export type FiltrosAnalitica = Record<string, string | number>;
export interface SolicitudReporteAnalitica {
  tipo: 'PREDICCIONES' | 'SEGMENTOS';
  origen: OrigenAnalitica;
  sucursal_id?: number;
  producto_id?: string;
  corte_desde?: string;
  corte_hasta?: string;
  grupo?: number;
}
export interface InterpretacionAnalitica {
  motor: string;
  requiere_aclaracion: boolean;
  mensaje: string;
  formato_sugerido: string;
  solicitud: SolicitudReporteAnalitica | null;
}
