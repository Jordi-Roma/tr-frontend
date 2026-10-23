export interface PerfilResponse {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  telefono: string | null;
  roles: string[];
  empresa_id: number | null;
  empresa_codigo: string | null;
  sesion_revocada: boolean;
}

export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
  telefono: string | null;
  username?: string;
  correo?: string;
  password_actual?: string;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nuevo: string;
  confirmar_password_nuevo: string;
}

export interface MensajeResponse {
  mensaje: string;
}

export interface DireccionResponse {
  id: number;
  ciudad_id: number;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
}

export interface ListaDireccionesResponse {
  direcciones: DireccionResponse[];
}

export interface CrearDireccionRequest {
  ciudad_id: number;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
}

export interface ActualizarDireccionRequest {
  ciudad_id: number;
  direccion: string;
  referencia: string | null;
  es_principal: boolean;
}
