// ── CATEGORÍAS ──────────────────────────────────────────────────────────────

export interface CategoriaResponse {
  id: number;
  categoria_padre_id: number | null;
  categoria_padre_nombre: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearCategoriaRequest {
  categoria_padre_id: number | null;
  nombre: string;
  descripcion: string | null;
}

export interface ActualizarCategoriaRequest {
  categoria_padre_id: number | null;
  nombre: string;
  descripcion: string | null;
}

// ── TALLAS ──────────────────────────────────────────────────────────────────

export interface TallaResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo_prenda?: string;
  ancho_cm?: number | null;
  largo_cm?: number | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearTallaRequest {
  nombre: string;
  descripcion: string | null;
  tipo_prenda?: string;
  ancho_cm?: number | null;
  largo_cm?: number | null;
}

export interface ActualizarTallaRequest {
  nombre: string;
  descripcion: string | null;
  tipo_prenda?: string;
  ancho_cm?: number | null;
  largo_cm?: number | null;
}

// ── COLORES ──────────────────────────────────────────────────────────────────

export interface ColorResponse {
  id: number;
  nombre: string;
  codigo_hex: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearColorRequest {
  nombre: string;
  codigo_hex: string | null;
}

export interface ActualizarColorRequest {
  nombre: string;
  codigo_hex: string | null;
}

// ── TEMPORADAS ────────────────────────────────────────────────────────────────
export interface TemporadaResponse {
  id: number;
  nombre: string;
  anio: number;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearTemporadaRequest {
  nombre: string;
  anio: number;
}

export interface ActualizarTemporadaRequest {
  nombre: string;
  anio: number;
}

// ── COLECCIONES ───────────────────────────────────────────────────────────────
export interface ColeccionResponse {
  id: number;
  temporada_id: number;
  temporada_nombre: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearColeccionRequest {
  temporada_id: number;
  nombre: string;
  descripcion: string | null;
}

export interface ActualizarColeccionRequest {
  temporada_id: number;
  nombre: string;
  descripcion: string | null;
}

// ── MARCAS ────────────────────────────────────────────────────────────────
export interface MarcaResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface CrearMarcaRequest {
  nombre: string;
  descripcion: string | null;
}

export interface ActualizarMarcaRequest {
  nombre: string;
  descripcion: string | null;
}

// ── COMPARTIDO ───────────────────────────────────────────────────────────────

export interface MensajeResponse {
  mensaje: string;
}
