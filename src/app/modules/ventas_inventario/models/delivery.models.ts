export type DeliveryEstado = 'PENDIENTE' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export interface DeliveryCotizarRequest {
  sucursal_id: number;
  direccion_entrega: string;
  referencia?: string | null;
  latitud_entrega: number;
  longitud_entrega: number;
}

export interface DeliveryCheckoutRequest extends DeliveryCotizarRequest {
  distancia_km?: number | string | null;
  tiempo_estimado_min?: number | null;
  costo_delivery?: number | string | null;
}

export interface DeliveryCotizacionResponse {
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
  sucursal_direccion?: string | null;
  sucursal_latitud?: number | string | null;
  sucursal_longitud?: number | string | null;
  latitud_entrega: number | string;
  longitud_entrega: number | string;
  observacion?: string | null;
}

export interface DeliveryEstadoRequest {
  estado: DeliveryEstado | string;
  observacion?: string | null;
}

export interface DeliveryEstadoResponse {
  mensaje: string;
  delivery: DeliveryDetalle;
}
