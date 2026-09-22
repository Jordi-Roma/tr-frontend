export interface ProveedorResponse {
  id: number;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fecha_creacion: string;
  usuarios_ids: number[];
}

export interface ProveedorPerfil {
  id: number;
  nombre: string;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface ProveedorProductoPanel {
  producto_id: number;
  nombre: string;
  categoria: string;
  marca?: string | null;
  material?: string | null;
  genero?: string | null;
  costo_referencia?: number | string | null;
  activo: boolean;
  variantes: number;
}

export interface ProveedorStockPanel {
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  producto_id: number;
  producto: string;
  producto_variante_id: number;
  sku: string;
  talla: string;
  color: string;
  stock_disponible: number;
  stock_reservado: number;
  stock_real: number;
  stock_minimo: number;
  bajo_stock: boolean;
}

export interface ProveedorEntregaPanel {
  id: number;
  fecha_movimiento: string;
  sucursal: string;
  ciudad: string;
  producto_id: number;
  producto: string;
  producto_variante_id: number;
  sku: string;
  talla: string;
  color: string;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string | null;
}

export interface CrearProveedorRequest {
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

export interface ActualizarProveedorRequest {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

export interface MensajeResponse {
  mensaje: string;
}
