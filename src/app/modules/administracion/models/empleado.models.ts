export interface EmpleadoResponse {
  empleado_id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  sucursal_id: number;
  sucursal_nombre: string;
  codigo_empleado: string;
  cargo: string;
  fecha_ingreso: string;
  activo: boolean;
  roles: string[];
  rol_laboral: string | null;
}

export interface AsignarUsuarioEmpleadoRequest {
  usuario_id: number;
  sucursal_id: number;
  codigo_empleado: string;
  cargo: string;
  rol: string;
}

export interface ActualizarEmpleadoRequest {
  sucursal_id: number;
  codigo_empleado: string;
  cargo: string;
  rol: string;
}

export interface ActivarEmpleadoRequest {
  rol: string;
}

export interface MensajeResponse {
  mensaje: string;
}

export interface CuentaEmpleadoDisponible { id: number; nombre: string; apellido: string; username: string; }
export interface CrearUsuarioEmpleadoRequest extends Omit<AsignarUsuarioEmpleadoRequest, 'usuario_id'> {
  nombre: string; apellido: string; username: string; correo: string; password: string;
}
