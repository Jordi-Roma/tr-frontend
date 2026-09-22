export type TipoDescuento = 'PORCENTAJE' | 'MONTO_FIJO';

export interface PromocionProductoResponse {
  id: number;
  nombre: string;
}

export interface PromocionSucursalResponse {
  id: number;
  nombre: string;
  ciudad: string;
}

export interface PromocionResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo_descuento: TipoDescuento;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  fecha_creacion: string;
  productos: PromocionProductoResponse[];
  sucursales: PromocionSucursalResponse[];
}

export interface PromocionRequest {
  nombre: string;
  descripcion: string | null;
  tipo_descuento: TipoDescuento;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  producto_ids: number[];
  sucursal_ids: number[];
}
