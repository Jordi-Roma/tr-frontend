export interface CarritoItemResponse {
  id: number;
  producto_variante_id: number;
  producto_id: number;
  producto: string;
  categoria: string;
  talla: string;
  color: string;
  sucursal_id?: number | null;
  sucursal?: string | null;
  ciudad?: string | null;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
  stock_disponible: number;
}

export interface CarritoSucursalDisponible {
  id: number;
  nombre: string;
  ciudad: string;
  latitud?: number | string | null;
  longitud?: number | string | null;
}

export interface CarritoResponse {
  id: number;
  items: CarritoItemResponse[];
  total: number | string;
  sucursales_disponibles?: CarritoSucursalDisponible[];
}

export interface AgregarCarritoItemRequest {
  producto_variante_id: number;
  sucursal_id?: number | null;
  cantidad: number;
}

export interface ActualizarCarritoItemRequest {
  cantidad: number;
}
