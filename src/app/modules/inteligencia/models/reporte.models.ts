export type TipoReporte = 'VENTAS' | 'PRODUCTOS_MAS_VENDIDOS' | 'INVENTARIO' | 'RESERVAS' | 'MOVIMIENTOS' | 'TRANSFERENCIAS' | 'PAGOS' | 'DELIVERIES' | 'USUARIOS';

export interface ReporteFiltros {
  tipo: TipoReporte;
  fecha_desde: string;
  fecha_hasta: string;
  sucursal_id: number | null;
  agrupacion: 'DIA' | 'MES';
  solo_bajo_stock: boolean;
  estado?: string | null;
  metodo_pago?: string | null;
  proveedor_pago?: string | null;
  tipo_entrega?: 'RECOJO_SUCURSAL' | 'DELIVERY' | null;
  rol?: string | null;
  activo?: boolean | null;
}

export interface ReporteCatalogo {
  tipos: { id: TipoReporte; nombre: string }[];
  sucursales: { id: number; nombre: string; ciudad: string }[];
}

export interface Interpretacion {
  interpretado: boolean;
  advertencias: string[];
  filtros: ReporteFiltros | null;
  texto_normalizado?: string;
}

export interface ReporteResultado {
  tipo: TipoReporte;
  titulo: string;
  nota: string | null;
  filtros_efectivos: ReporteFiltros & { sucursal: string };
  generado_en: string;
  indicadores: { label: string; valor: number }[];
  serie_grafico: { label: string; valor: number }[];
  columnas: { key: string; label: string }[];
  filas: Record<string, string | number | null>[];
  total_filas: number;
  sin_datos: boolean;
}
