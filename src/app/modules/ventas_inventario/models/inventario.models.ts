export interface InventarioResponse {
  id: number;
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  producto_variante_id: number;
  producto_id: number;
  producto: string;
  categoria: string;
  talla: string;
  color: string;
  stock_disponible: number;
  stock_reservado: number;
  stock_real: number;
  stock_minimo: number;
  bajo_stock: boolean;
}

export interface MovimientoInventarioRequest {
  sucursal_id: number;
  producto_variante_id: number;
  tipo: string;
  cantidad: number;
  motivo?: string | null;
  proveedor_id?: number | null;
}

export interface MovimientoInventarioResponse {
  id: number;
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  producto_variante_id: number;
  producto_id: number;
  producto: string;
  talla: string;
  color: string;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string | null;
  proveedor_id?: number | null;
  proveedor?: string | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
  fecha_movimiento: string;
}

export interface TransferenciaItemRequest {
  producto_variante_id: number;
  cantidad: number;
}

export interface CrearTransferenciaRequest {
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  observacion?: string | null;
  items: TransferenciaItemRequest[];
}

export interface TransferenciaResponse {
  id: number;
  sucursal_origen_id: number;
  sucursal_origen: string;
  sucursal_destino_id: number;
  sucursal_destino: string;
  estado: string;
  observacion?: string | null;
  fecha_transferencia: string;
  detalles: Array<{
    id: number;
    producto_variante_id: number;
    producto_id: number;
    producto: string;
    talla: string;
    color: string;
    cantidad: number;
  }>;
}

export interface VentaItemRequest {
  producto_variante_id: number;
  cantidad: number;
  descuento: number;
}

export interface CrearVentaPresencialRequest {
  sucursal_id: number;
  cliente_id?: number | null;
  metodo_pago?: string | null;
  observacion?: string | null;
  items: VentaItemRequest[];
}

export interface VentaPresencialResponse {
  id: number;
  codigo: string;
  sucursal_id: number;
  sucursal: string;
  estado: string;
  subtotal: number | string;
  descuento: number | string;
  total: number | string;
  metodo_pago?: string | null;
  observacion?: string | null;
  fecha_venta: string;
  detalles: Array<{
    id: number;
    producto_variante_id: number;
    producto_id: number;
    producto: string;
    talla: string;
    color: string;
    cantidad: number;
    precio_unitario: number | string;
    descuento: number | string;
    subtotal: number | string;
  }>;
}
