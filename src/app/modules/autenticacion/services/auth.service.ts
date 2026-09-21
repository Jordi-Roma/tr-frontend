import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, Observable, of, tap } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenSignal = signal<string | null>(this.leerToken());
  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(
    this.leerUsuario()
  );

  readonly tokenActual = this.tokenSignal.asReadonly();
  readonly usuarioActual = this.usuarioSignal.asReadonly();

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/autenticacion/login`, request)
      .pipe(tap((response) => this.guardarSesion(response)));
  }

  registrar(request: RegistroRequest): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(
      `${API_BASE_URL}/api/v1/autenticacion/registro`,
      request
    );
  }

  solicitarPasswordReset(
    request: SolicitarPasswordResetRequest
  ): Observable<PasswordResetMensajeResponse> {
    return this.http.post<PasswordResetMensajeResponse>(
      `${API_BASE_URL}/api/v1/autenticacion/password-reset/solicitar`,
      request
    );
  }

  confirmarPasswordReset(
    request: ConfirmarPasswordResetRequest
  ): Observable<PasswordResetMensajeResponse> {
    return this.http.post<PasswordResetMensajeResponse>(
      `${API_BASE_URL}/api/v1/autenticacion/password-reset/confirmar`,
      request
    );
  }

  logout(): Observable<unknown> {
    if (this.tokenSignal() === null) {
      this.limpiarSesion();
      return of(null);
    }

    return this.http
      .post<unknown>(`${API_BASE_URL}/api/v1/autenticacion/logout`, {})
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.limpiarSesion())
      );
  }

  guardarSesion(response: LoginResponse): void {
    const usuario: UsuarioAutenticado = {
      id: response.usuario_id,
      nombre: response.nombre,
      apellido: response.apellido,
      username: response.username,
      correo: response.correo,
      roles: response.roles,
    };

    this.tokenSignal.set(response.access_token);
    this.usuarioSignal.set(usuario);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
  }

  limpiarSesion(): void {
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
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

  private leerToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private leerUsuario(): UsuarioAutenticado | null {
    const usuarioGuardado = localStorage.getItem(USER_STORAGE_KEY);

    if (usuarioGuardado === null) {
      return null;
    }

    try {
      return JSON.parse(usuarioGuardado) as UsuarioAutenticado;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }
}
