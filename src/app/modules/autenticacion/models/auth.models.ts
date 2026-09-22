export interface LoginRequest {
  identificador: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario_id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  roles: string[];
  mensaje: string;
}

export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  roles: string[];
}

export interface RegistroRequest {
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  password: string;
  telefono?: string | null;
}

export interface RegistroResponse {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  roles: string[];
  mensaje: string;
}

export interface SolicitarPasswordResetRequest {
  identificador: string;
}

export interface ConfirmarPasswordResetRequest {
  identificador: string;
  codigo: string;
  password_nuevo: string;
  confirmar_password_nuevo: string;
}

export interface PasswordResetMensajeResponse {
  mensaje: string;
}
