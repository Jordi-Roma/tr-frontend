export interface DevolucionVentaDetalle {
  venta_detalle_id: number;
  producto_variante_id: number;
  producto: string;
  talla: string;
  color: string;
  cantidad_vendida: number;
  cantidad_disponible: number;
  precio_unitario: number | string;
  subtotal: number | string;
}

export interface VentaDevolucionElegible {
  venta_id: number;
  venta_codigo: string;
  venta_tipo: string;
  fecha_venta: string;
  sucursal: string;
  metodo_pago: string | null;
  total: number | string;
  detalles: DevolucionVentaDetalle[];
}

export interface CrearDevolucionRequest {
  motivo: string;
  observacion?: string | null;
  items: { venta_detalle_id: number; cantidad: number }[];
}

export interface DevolucionDetalle {
  id: number;
  venta_detalle_id: number;
  producto_variante_id: number;
  producto: string;
  talla: string;
  color: string;
  cantidad_vendida: number;
  cantidad_solicitada: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  precio_unitario: number | string;
  subtotal_original: number | string;
  monto_aprobado: number | string;
  observacion: string | null;
  inventario_repuesto: boolean;
}

export interface Devolucion {
  id: number;
  codigo: string;
  venta_id: number;
  venta_codigo: string;
  cliente_nombre: string | null;
  cliente_correo: string | null;
  sucursal: string;
  estado: string;
  motivo: string;
  observacion: string | null;
  monto_solicitado: number | string;
  monto_aprobado: number | string;
  moneda: string;
  metodo_pago_original: string | null;
  proveedor_pago_original: string | null;
  metodo_reembolso: string | null;
  proveedor_refund_estado: string | null;
  referencia_reembolso: string | null;
  error_reembolso: string | null;
  fecha_solicitud: string;
  fecha_revision: string | null;
  fecha_recepcion: string | null;
  fecha_reembolso: string | null;
  detalles: DevolucionDetalle[];
}
