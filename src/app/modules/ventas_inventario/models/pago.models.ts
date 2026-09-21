import { DeliveryCheckoutRequest } from './delivery.models';

export interface CrearCheckoutStripeRequest {
  sucursal_id?: number | null;
  tipo_entrega?: 'RECOJO_SUCURSAL' | 'DELIVERY';
  delivery?: DeliveryCheckoutRequest | null;
}

export interface CheckoutStripeResponse {
  orden_id: number;
  venta_id: number;
  estado: string;
  checkout_url: string;
}

export interface OrdenPagoResponse {
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
