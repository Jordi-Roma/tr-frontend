export interface ProveedorResponse {
  id: number;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fecha_creacion: string;
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
