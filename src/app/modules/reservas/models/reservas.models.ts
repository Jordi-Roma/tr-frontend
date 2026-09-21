export interface ReservaDetalleResponse {
  id: number;
  producto_variante_id: number;
  producto_id: number;
  producto: string;
  categoria: string;
  talla: string;
  color: string;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
}

export interface ReservaResponse {
  id: number;
  codigo: string;
  cliente_id: number;
  cliente?: string | null;
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  estado: string;
  total: number | string;
  monto_reserva: number | string;
  monto_aplicado: number | string;
  anticipo_pagado: boolean;
  anticipo_orden_id?: number | null;
  venta_id?: number | null;
  fecha_cita?: string | null;
  fecha_reserva: string;
  fecha_expiracion?: string | null;
  observacion?: string | null;
  detalles: ReservaDetalleResponse[];
}

export interface CrearReservaDesdeCarritoRequest {
  sucursal_id: number;
  fecha_cita: string;
  observacion?: string | null;
}

export interface CambiarEstadoReservaRequest {
  estado: string;
}

export interface FinalizarReservaItemRequest {
  reserva_detalle_id: number;
  cantidad: number;
}

export interface FinalizarReservaRequest {
  metodo_pago?: string | null;
  observacion?: string | null;
  items: FinalizarReservaItemRequest[];
}

export interface ReservaPagoResponse {
  reserva: ReservaResponse;
  requiere_checkout: boolean;
  orden_id?: number | null;
  venta_id?: number | null;
  checkout_url?: string | null;
  mensaje?: string | null;
}
