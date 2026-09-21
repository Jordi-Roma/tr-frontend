export interface ImagenProductoResponse {
  id: number;
  producto_id: number;
  url: string;
  es_principal: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface ImagenProductoRequest {
  url: string;
  es_principal: boolean;
}

export interface ProductoResponse {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  marca_id: number | null;
  marca_nombre: string | null;
  nombre: string;
  descripcion: string | null;
  material: string | null;
  genero: string | null;
  tipo_prenda?: string;
  tipo_corte?: string;
  ancho_base_cm?: number | null;
  largo_base_cm?: number | null;
  activo: boolean;
  fecha_creacion: string;
  colecciones_ids: number[];
  proveedores_ids: number[];
  imagenes: ImagenProductoResponse[];
}

export interface CrearProductoRequest {
  categoria_id: number;
  marca_id: number | null;
  nombre: string;
  descripcion: string | null;
  material: string | null;
  genero: string | null;
  tipo_prenda?: string;
  tipo_corte?: string;
  ancho_base_cm?: number | null;
  largo_base_cm?: number | null;
  colecciones_ids: number[];
  proveedores_ids: number[];
  imagenes: ImagenProductoRequest[];
}

export interface ActualizarProductoRequest {
  categoria_id: number;
  marca_id: number | null;
  nombre: string;
  descripcion: string | null;
  material: string | null;
  genero: string | null;
  tipo_prenda?: string;
  tipo_corte?: string;
  ancho_base_cm?: number | null;
  largo_base_cm?: number | null;
  colecciones_ids: number[];
  proveedores_ids: number[];
  imagenes: ImagenProductoRequest[];
}
