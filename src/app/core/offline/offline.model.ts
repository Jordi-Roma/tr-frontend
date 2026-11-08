export const EQUIPO_COMPARTIDO = 'stylear_pwa_compartida_v1';
export const ACCESO_OFFLINE = 'stylear_pwa_acceso_v1';
export const CIERRE_COMPARTIDO = 'stylear_pwa_cierre_v1';
export const ROLES_VENTA = ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'];
export const rolesOffline = (roles: readonly string[]): boolean =>
  roles.includes('CLIENTE') || roles.some((rol) => ROLES_VENTA.includes(rol));

export interface Sobre {
  iv: Uint8Array<ArrayBuffer>;
  datos: ArrayBuffer;
}

export interface CuentaOffline {
  ambito: string;
  sal: Uint8Array<ArrayBuffer>;
  iteraciones: number;
  clave: Sobre;
}

export interface IdentidadOffline {
  usuario: number;
  empresa: number;
  codigo: string;
  roles: string[];
  vence: number;
}

export interface SucursalOffline {
  id: number;
  nombre: string;
}

export interface VarianteOffline {
  variante_id: number;
  producto_id: number;
  nombre: string;
  talla: string | null;
  color: string | null;
  stock: number;
  precio_centavos: number | null;
}

export type TipoOperacion = 'VENTA' | 'RESERVA';
export interface LineaOffline {
  producto_variante_id: number;
  cantidad: number;
  precio_centavos: number;
}
export interface HistorialOffline {
  id: number;
  tipo: TipoOperacion | 'PAGO';
  codigo: string;
  estado: string;
  total: string | number;
  fecha: string;
  sucursal?: number;
  detalles?: { producto?: string; producto_variante_id?: number; cantidad: number }[];
}
export interface DescargaOffline {
  fecha: number;
  sucursales: SucursalOffline[];
  catalogo: Record<number, VarianteOffline[]>;
  historial: HistorialOffline[];
}
export interface OperacionOffline {
  uuid: string;
  tipo: TipoOperacion;
  sucursal: number;
  fecha: number;
  lineas: LineaOffline[];
  fechaCita?: string;
  efectivo?: number;
  estado: 'Pendiente' | 'Confirmada' | 'En conflicto' | 'Rechazada';
  motivo?: string;
  resultado?: HistorialOffline;
  efectivoDevuelto?: number;
}
export interface ColaOffline {
  ambito: string;
  uuid: string;
  orden: number;
  contenido: Sobre;
  intentos: number;
  siguiente: number;
  reclamo?: { id: string; vence: number };
}
