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
  paquete_origen_id?: number | null;
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
  version: number;
  modo: string;
  titular: string;
  stripe_habilitado: boolean;
  qr_habilitado: boolean;
  confirmacion_prueba: boolean;
  stripe_conexion: string;
  qr_conexion: string;
}
export interface ReembolsoPago {
  id: number;
  orden_id: number;
  monto: string;
  moneda: string;
  metodo: string;
  motivo: string;
  estado: string;
  referencia: string | null;
}
export interface NotificacionPropia {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  orden_id: number | null;
  creado_en: string;
  categoria: CategoriaNotificacion;
  recurso_tipo?: string | null;
  recurso_id?: number | null;
}

export const CATEGORIAS_NOTIFICACION = [
  'GENERAL',
  'COMPRA',
  'PAGO',
  'RESERVA',
  'ENTREGA',
  'CAMBIO',
  'DEVOLUCION',
  'REEMBOLSO',
] as const;
export type CategoriaNotificacion = (typeof CATEGORIAS_NOTIFICACION)[number];
export interface BandejaNotificaciones {
  avisos: NotificacionPropia[];
  total: number;
  no_leidas: number;
  pagina: number;
  tamano: number;
}
export interface PreferenciasNotificaciones {
  categorias: Record<CategoriaNotificacion, boolean>;
  bandeja_transaccional: boolean;
}
export interface DestinoNotificacion {
  disponible: boolean;
  accion: string;
  recurso_tipo?: string;
  recurso_id?: number;
}
export interface EstadoNotificacion {
  leida: boolean;
  creado_en: string;
  leida_en: string | null;
  aceptadas_fcm: number;
  pendientes: number;
  fallidas: number;
  omitidas: number;
  ultima_aceptacion: string | null;
}
export function rutaNotificacion(d: DestinoNotificacion): string | null {
  if (
    !d.disponible ||
    d.accion !== 'VER_DETALLE' ||
    !Number.isSafeInteger(d.recurso_id) ||
    d.recurso_id! <= 0
  )
    return null;
  const base: Record<string, string> = {
    RESERVA: '/reservas/',
    ORDEN_PAGO: '/mis-pagos/',
    DELIVERY: '/mis-deliveries/',
  };
  return base[d.recurso_tipo ?? '']
    ? base[d.recurso_tipo!] + d.recurso_id
    : d.recurso_tipo === 'CAMBIO'
      ? '/cambios'
      : d.recurso_tipo === 'DEVOLUCION'
        ? '/mis-devoluciones'
        : null;
}
