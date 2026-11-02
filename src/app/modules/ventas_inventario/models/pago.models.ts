import { DeliveryCheckoutRequest } from './delivery.models';

export interface CrearCheckoutStripeRequest {
  clave_operacion?: string;
  total_esperado?: number;
  sucursal_id?: number | null;
  tipo_entrega?: 'RECOJO_SUCURSAL' | 'DELIVERY';
  delivery?: DeliveryCheckoutRequest | null;
}

export interface CheckoutStripeResponse {
  modo_pago?: string;
  confirmacion_prueba?: boolean;
  orden_id: number;
  venta_id: number;
  estado: string;
  checkout_url: string;
}

export interface CrearCheckoutQrRequest {
  clave_operacion?: string;
  total_esperado?: number;
  sucursal_id?: number | null;
  tipo_entrega?: 'RECOJO_SUCURSAL' | 'DELIVERY';
  delivery?: DeliveryCheckoutRequest | null;
}

export interface CheckoutQrResponse {
  modo_pago?: string;
  confirmacion_prueba?: boolean;
  orden_id: number;
  venta_id: number;
  monto_total: number | string;
  moneda: string;
  estado: string;
  qr_payload: string;
  alias: string;
  banco: string;
  cuenta: string;
  titular: string;
  glosa: string;
  vencimiento: string;
}

export interface OrdenPagoResponse {
  pago_recibido?: boolean;
  motivo_incidencia?: string | null;
  modo_pago?: string;
  confirmacion_prueba?: boolean;
  orden_id: number;
  venta_id: number;
  cliente_id?: number | null;
  monto_total: number | string;
  moneda: string;
  metodo: string;
  estado: string;
  proveedor: string;
  checkout_url?: string | null;
  proveedor_session_id?: string | null;
  fecha_pago?: string | null;
}

export interface ConfirmarPagoPruebaRequest {
  aprobar: boolean;
}

export interface PagoFiltros {
  estado?: string | null;
  metodo?: string | null;
  proveedor?: string | null;
  cliente?: string | null;
  sucursal_id?: number | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
}

export interface PagoHistorialItem {
  orden_id: number;
  venta_id: number;
  venta_codigo?: string | null;
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  cliente_correo?: string | null;
  sucursal_id?: number | null;
  sucursal_nombre?: string | null;
  monto_total: number | string;
  moneda: string;
  metodo: string;
  estado: string;
  proveedor: string;
  fecha_creacion: string;
  fecha_pago?: string | null;
}

export interface PagoProductoDetalle {
  tipo_compra?: string;
  paquete_origen_id?: number|null;
  producto: string;
  categoria?: string | null;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
}

export interface PagoHistorialDetalle extends PagoHistorialItem {
  proveedor_session_id?: string | null;
  proveedor_payment_intent_id?: string | null;
  checkout_url?: string | null;
  productos: PagoProductoDetalle[];
}

export interface ConfiguracionPagosEmpresa {
  version: number; modo: string; titular: string; stripe_habilitado: boolean; qr_habilitado: boolean;
  confirmacion_prueba: boolean; stripe_conexion: string; qr_conexion: string;
}
export interface ReembolsoPago {
  id: number; orden_id: number; monto: string; moneda: string; metodo: string; motivo: string;
  estado: string; referencia: string | null;
}
export interface NotificacionPropia {
  id: number; titulo: string; mensaje: string; leida: boolean; orden_id: number | null; creado_en: string;
}
