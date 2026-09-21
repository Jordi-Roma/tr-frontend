export interface RolResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  cantidad_permisos: number;
}

export interface PermisoResponse {
  id: number;
  nombre: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CrearRolRequest {
  nombre: string;
  descripcion: string | null;
}

export interface ActualizarRolRequest {
  nombre: string;
  descripcion: string | null;
}

export interface CrearPermisoRequest {
  nombre: string;
  modulo: string;
  accion: string;
  descripcion: string | null;
}

export interface ActualizarPermisosRolRequest {
  permiso_ids: number[];
}

export interface RolPermisosResponse {
  rol: RolResponse;
  permiso_ids: number[];
}

export interface MensajeResponse {
  mensaje: string;
}
