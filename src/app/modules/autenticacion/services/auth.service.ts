import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PerfilResponse } from '../models/perfil.models';
import { EmpresaContextoService } from '../../../core/services/empresa-contexto.service';
import { CambioContextoService } from '../../../core/services/cambio-contexto.service';
import {
  LoginRequest,
  LoginResponse,
  ConfirmarPasswordResetRequest,
  PasswordResetMensajeResponse,
  RegistroRequest,
  RegistroResponse,
  SolicitarPasswordResetRequest,
  UsuarioAutenticado,
} from '../models/auth.models';

const TOKEN_STORAGE_KEY = 'backend_tr_token';
const USER_STORAGE_KEY = 'backend_tr_usuario';
function objeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function sesionLocalValida(token: string, usuario: unknown): usuario is UsuarioAutenticado {
  if (
    !objeto(usuario) ||
    !Number.isSafeInteger(usuario['id']) ||
    !Array.isArray(usuario['roles']) ||
    !usuario['roles'].every((r: unknown) => typeof r === 'string')
  )
    return false;
  if (!['nombre', 'apellido', 'username', 'correo'].every((k) => typeof usuario[k] === 'string'))
    return false;
  const plataforma =
    usuario['empresa_id'] === null &&
    usuario['empresa_codigo'] === null &&
    usuario['roles'].includes('ADMIN_SAAS');
  const comercial =
    Number.isSafeInteger(usuario['empresa_id']) &&
    Number(usuario['empresa_id']) > 0 &&
    typeof usuario['empresa_codigo'] === 'string' &&
    /^[a-z0-9][a-z0-9-]{1,39}$/.test(usuario['empresa_codigo']) &&
    !usuario['roles'].includes('ADMIN_SAAS');
  if (!plataforma && !comercial) return false;
  try {
    const cuerpo: unknown = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    return (
      objeto(cuerpo) &&
      cuerpo['empresa_id'] === usuario['empresa_id'] &&
      Number(cuerpo['sub']) === usuario['id'] &&
      Number(cuerpo['exp']) * 1000 > Date.now() &&
      !!cuerpo['sid']
    );
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly contexto = inject(EmpresaContextoService);
  private readonly cambios = inject(CambioContextoService);
  private readonly router = inject(Router);
  private readonly inicial = this.leerSesion();
  private readonly tokenSignal = signal<string | null>(this.inicial?.token ?? null);
  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(this.inicial?.usuario ?? null);
  readonly permisos = signal<string[] | null>(null);
  puede(permiso: string): boolean {
    return (
      this.tieneRol('ADMIN_SAAS') ||
      (this.tieneRol('ADMINISTRADOR') && (this.permisos()?.includes(permiso) ?? false))
    );
  }
  cargarCapacidades(): Observable<{ permisos: string[] }> {
    if (this.permisos() !== null) return of({ permisos: this.permisos()! });
    return this.http
      .get<{ permisos: string[] }>(API_BASE_URL + '/api/v1/autenticacion/capacidades')
      .pipe(tap((r) => this.permisos.set(r.permisos)));
  }
  readonly tokenActual = this.tokenSignal.asReadonly();
  readonly usuarioActual = this.usuarioSignal.asReadonly();

  constructor() {
    globalThis.addEventListener?.('storage', (event: StorageEvent) => {
      if (
        (event.key === TOKEN_STORAGE_KEY || event.key === USER_STORAGE_KEY || event.key === null) &&
        this.tokenSignal() &&
        localStorage.getItem(TOKEN_STORAGE_KEY) !== this.tokenSignal()
      ) {
        this.limpiarSesion();
        this.contexto.limpiar();
        void this.router.navigateByUrl('/empresa');
      }
    });
  }

  login(request: LoginRequest, plataforma = false): Observable<LoginResponse> {
    const codigo = plataforma ? null : this.contexto.empresa()?.codigo;
    if (!plataforma && !codigo)
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { detail: 'Selecciona una empresa antes de ingresar.' },
          }),
      );
    this.limpiarSesion();
    if (plataforma) this.contexto.limpiar();
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/autenticacion/login`, {
        ...request,
        empresa_codigo: codigo,
      })
      .pipe(tap((response) => this.guardarSesion(response)));
  }

  registrar(request: RegistroRequest): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${API_BASE_URL}/api/v1/autenticacion/registro`, {
      ...request,
      empresa_codigo: this.contexto.empresa()?.codigo,
    });
  }
  solicitarPasswordReset(
    request: SolicitarPasswordResetRequest,
    plataforma = false,
  ): Observable<PasswordResetMensajeResponse> {
    return this.http.post<PasswordResetMensajeResponse>(
      `${API_BASE_URL}/api/v1/autenticacion/password-reset/solicitar`,
      { ...request, empresa_codigo: plataforma ? null : this.contexto.empresa()?.codigo },
    );
  }
  confirmarPasswordReset(
    request: ConfirmarPasswordResetRequest,
    plataforma = false,
  ): Observable<PasswordResetMensajeResponse> {
    return this.http.post<PasswordResetMensajeResponse>(
      `${API_BASE_URL}/api/v1/autenticacion/password-reset/confirmar`,
      { ...request, empresa_codigo: plataforma ? null : this.contexto.empresa()?.codigo },
    );
  }
  logout(): Observable<unknown> {
    const operacion = this.tokenSignal()
      ? this.http
          .post<unknown>(`${API_BASE_URL}/api/v1/autenticacion/logout`, {})
          .pipe(catchError(() => of(null)))
      : of(null);
    return operacion.pipe(tap(() => this.limpiarSesion()));
  }
  guardarSesion(response: LoginResponse): void {
    const usuario: UsuarioAutenticado = {
      id: response.usuario_id,
      nombre: response.nombre,
      apellido: response.apellido,
      username: response.username,
      correo: response.correo,
      roles: response.roles,
      empresa_id: response.empresa_id,
      empresa_codigo: response.empresa_codigo,
    };
    if (
      !sesionLocalValida(response.access_token, usuario) ||
      (usuario.empresa_id !== null &&
        (usuario.empresa_id !== this.contexto.empresa()?.id ||
          usuario.empresa_codigo !== this.contexto.empresa()?.codigo))
    ) {
      throw new HttpErrorResponse({
        status: 403,
        error: { detail: 'La sesión no corresponde a la empresa seleccionada.' },
      });
    }
    this.tokenSignal.set(response.access_token);
    this.usuarioSignal.set(usuario);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
  }
  actualizarPerfilLocal(perfil: PerfilResponse): void {
    const actual = this.usuarioSignal();
    if (!actual || actual.id !== perfil.id || actual.empresa_id !== perfil.empresa_id) return;
    const usuario = {
      ...actual,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      username: perfil.username,
      correo: perfil.correo,
      roles: perfil.roles,
    };
    this.usuarioSignal.set(usuario);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
  }
  limpiarSesion(): void {
    this.permisos.set(null);
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.cambios.invalidar();
  }
  estaAutenticado(): boolean {
    return this.tokenSignal() !== null;
  }
  tieneRol(rol: string): boolean {
    return this.usuarioSignal()?.roles.includes(rol) ?? false;
  }
  obtenerToken(): string | null {
    return this.tokenSignal();
  }

  private leerSesion(): { token: string; usuario: UsuarioAutenticado } | null {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    try {
      const usuario: unknown = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null');
      if (token && sesionLocalValida(token, usuario)) return { token, usuario };
    } catch {
      /* Invalid or pre-multitenant session: request a new login. */
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}
