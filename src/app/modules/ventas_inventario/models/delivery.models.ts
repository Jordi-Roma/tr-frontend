export type DeliveryEstado = 'PENDIENTE_PAGO' | 'PENDIENTE' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export interface DeliveryCotizarRequest {
  direccion_id?: number|null;
  sucursal_id: number;
  direccion_entrega: string;
  referencia?: string | null;
  latitud_entrega: number;
  longitud_entrega: number;
}

export interface DeliveryCheckoutRequest extends DeliveryCotizarRequest {
  cotizacion_id?: string|null;
  distancia_km?: number | string | null;
  tiempo_estimado_min?: number | null;
  costo_delivery?: number | string | null;
}

export interface DeliveryCotizacionResponse {
  cotizacion_id?: string|null;
  vence_en?: string|null;
  ruta?: number[][];
  origen_latitud?: number|string|null;
  origen_longitud?: number|string|null;
  sucursal_id: number;
  distancia_km: number | string;
  tiempo_estimado_min: number;
  costo_delivery: number | string;
  disponible: boolean;
  mensaje?: string | null;
}

export interface DeliveryGeocodificarResponse {
  direccion: string;
  latitud: number | string;
  longitud: number | string;
}

export interface DeliveryFiltros {
  estado?: string | null;
  cliente?: string | null;
  sucursal_id?: number | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
}

export interface DeliveryItem {
  version: number;
  pago_confirmado: boolean;
  incidencia_abierta: boolean;
  id: number;
  venta_id: number;
  venta_codigo?: string | null;
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  cliente_correo?: string | null;
  sucursal_id: number;
  sucursal_nombre?: string | null;
  direccion_entrega: string;
  referencia?: string | null;
  distancia_km?: number | string | null;
  tiempo_estimado_min?: number | null;
  costo_delivery: number | string;
  estado: DeliveryEstado | string;
  total_venta?: number | string | null;
  fecha_creacion: string;
  fecha_entrega?: string | null;
}

export interface DeliveryDetalle extends DeliveryItem {
  ruta:number[][];
  historial: {tipo:string;estado_anterior:string|null;estado_nuevo:string;observacion:string|null;version:number;fecha:string}[];
  transiciones:string[];
  puede_gestionar:boolean;
  cotizacion_id?:string|null;
  sucursal_direccion?: string | null;
  sucursal_latitud?: number | string | null;
  sucursal_longitud?: number | string | null;
  latitud_entrega: number | string;
  longitud_entrega: number | string;
  observacion?: string | null;
}

export interface DeliveryEstadoRequest {
  version:number;
  recepcion_confirmada?:boolean;
  estado: DeliveryEstado | string;
  observacion?: string | null;
}

export interface DeliveryEstadoResponse {
  mensaje: string;
  delivery: DeliveryDetalle;
}
