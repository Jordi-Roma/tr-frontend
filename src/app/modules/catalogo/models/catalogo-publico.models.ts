export interface CatalogoTalla {
  id: number;
  nombre: string;
}

export interface CatalogoColor {
  id: number;
  nombre: string;
  hex?: string | null;
}

export interface CatalogoDisponibilidad {
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  variante_id: number;
  talla_id?: number | null;
  talla?: string | null;
  color_id?: number | null;
  color?: string | null;
  stock_disponible: number;
  stock_reservado: number;
  disponible: boolean;
}

export interface CatalogoVariante {
  id: number;
  sku: string;
  talla_id?: number | null;
  talla?: string | null;
  color_id?: number | null;
  color?: string | null;
  color_hex?: string | null;
  precio_vigente?: number | string | null;
  precio_final?: number | string | null;
  tiene_promocion: boolean;
  stock_total: number;
  activo: boolean;
}

export interface CatalogoPrendaItem {
  producto_id: number;
  nombre: string;
  descripcion?: string | null;
  categoria_id: number;
  categoria: string;
  marca_id?: number | null;
  marca?: string | null;
  material?: string | null;
  genero?: string | null;
  precio_vigente?: number | string | null;
  precio_final?: number | string | null;
  tiene_promocion: boolean;
  stock_total: number;
  tallas: CatalogoTalla[];
  colores: CatalogoColor[];
  imagen_principal?: string | null;
  activo: boolean;
}

export interface CatalogoPrendasResponse {
  items: CatalogoPrendaItem[];
  total: number;
  pagina: number;
  por_pagina: number;
}

export interface CatalogoPrendaDetalle extends CatalogoPrendaItem {
  colecciones: string[];
  variantes: CatalogoVariante[];
  disponibilidad: CatalogoDisponibilidad[];
}

export interface CatalogoDisponibilidadProductoResponse {
  producto_id: number;
  disponibilidad: CatalogoDisponibilidad[];
}

export interface CatalogoSucursal {
  id: number;
  nombre: string;
  ciudad: string;
  latitud?: number | string | null;
  longitud?: number | string | null;
}

export interface CatalogoOpcion {
  id: number;
  nombre: string;
}

export interface CatalogoFiltrosResponse {
  categorias: CatalogoOpcion[];
  tallas: CatalogoOpcion[];
  colores: CatalogoColor[];
  temporadas: CatalogoOpcion[];
  colecciones: CatalogoOpcion[];
  sucursales: CatalogoSucursal[];
}

export interface CatalogoFiltros {
  q?: string;
  categoria_id?: number | null;
  talla_id?: number | null;
  color_id?: number | null;
  temporada_id?: number | null;
  coleccion_id?: number | null;
  sucursal_id?: number | null;
  precio_min?: number | null;
  precio_max?: number | null;
  orden?: 'relevancia' | 'nombre' | 'precio-asc' | 'precio-desc';
  solo_disponibles?: boolean;
  pagina?: number;
  por_pagina?: number;
}
