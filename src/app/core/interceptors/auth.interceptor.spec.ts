import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../config/api.config';
import { EmpresaContextoService } from '../services/empresa-contexto.service';
import { EstadoPlanService } from '../services/estado-plan.service';
import { TiendaStateService } from '../services/tienda-state.service';
import { AuthService, sesionLocalValida } from '../../modules/autenticacion/services/auth.service';
import { LoginResponse } from '../../modules/autenticacion/models/auth.models';
import { authInterceptor } from './auth.interceptor';

function sesion(empresa = 1, codigo = 'empresa-a'): LoginResponse {
  const cuerpo = {
    sub: '7',
    sid: '9',
    empresa_id: empresa,
    exp: Math.floor(Date.now() / 1000) + 600,
  };
  return {
    access_token: `test.${btoa(JSON.stringify(cuerpo))}.test`,
    token_type: 'bearer',
    usuario_id: 7,
    nombre: 'Ana',
    apellido: 'Prueba',
    username: 'ana',
    correo: 'ana@example.invalid',
    roles: ['CLIENTE'],
    empresa_id: empresa,
    empresa_codigo: codigo,
    mensaje: 'OK',
  };
}

describe('Contexto y sesión multitenant', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let contexto: EmpresaContextoService;
  let auth: AuthService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            url: '/catalogo',
            currentNavigation: () => null,
            navigateByUrl: vi.fn().mockResolvedValue(true),
            navigate: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    contexto = TestBed.inject(EmpresaContextoService);
    auth = TestBed.inject(AuthService);
    contexto.seleccionar({ id: 1, codigo: 'empresa-a', nombre: 'Empresa A', estado: 'ACTIVA' });
  });
  afterEach(() => backend.verify());

  it('añade código y token solamente a la API configurada', () => {
    auth.guardarSesion(sesion());
    http.get(`${API_BASE_URL}/api/v1/catalogo/prendas`).subscribe();
    const r = backend.expectOne(`${API_BASE_URL}/api/v1/catalogo/prendas`);
    expect(r.request.headers.get('X-Empresa-Codigo')).toBe('empresa-a');
    expect(r.request.headers.get('Authorization')).toContain('Bearer test.');
    r.flush({});
    http.get('https://otro-dominio.invalid/api/v1/prendas').subscribe();
    const externa = backend.expectOne('https://otro-dominio.invalid/api/v1/prendas');
    expect(externa.request.headers.has('Authorization')).toBe(false);
    expect(externa.request.headers.has('X-Empresa-Codigo')).toBe(false);
    externa.flush({});
  });
  it('rechaza antes de enviar una petición privada con contexto de otra empresa', () => {
    auth.guardarSesion(sesion());
    contexto.seleccionar({ id: 2, codigo: 'empresa-b', nombre: 'B', estado: 'ACTIVA' });
    const error = vi.fn();
    http.get(`${API_BASE_URL}/api/v1/categorias`).subscribe({ error });
    backend.expectNone(`${API_BASE_URL}/api/v1/categorias`);
    expect(error.mock.calls[0][0].status).toBe(403);
  });
  it('descarta respuestas antiguas y limpia carrito, favoritos y sucursal', () => {
    auth.guardarSesion(sesion());
    const tienda = TestBed.inject(TiendaStateService);
    tienda.agregarAlCarrito({ id: 10, nombre: 'Prenda A', categoria: 'A', precio: 20 });
    tienda.seleccionarSucursalCarrito(3);
    tienda.reemplazarFavoritos([{ id: 10, nombre: 'Prenda A', categoria: 'A', precio: 20 }]);
    const next = vi.fn();
    http.get(`${API_BASE_URL}/api/v1/carrito`).subscribe(next);
    const r = backend.expectOne(`${API_BASE_URL}/api/v1/carrito`);
    auth.limpiarSesion();
    expect(r.cancelled).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(tienda.carrito()).toEqual([]);
    expect(tienda.favoritos()).toEqual([]);
    expect(tienda.sucursalCarrito()).toBeNull();
  });
  it('conserva la sesión ante un 403 de vigencia y permite confirmar QR pendiente', () => {
    auth.guardarSesion(sesion());
    const error = vi.fn();
    http.post(`${API_BASE_URL}/api/v1/reservas/desde-carrito`, {}).subscribe({ error });
    backend
      .expectOne(`${API_BASE_URL}/api/v1/reservas/desde-carrito`)
      .flush(
        { detail: { codigo: 'SUSCRIPCION_NO_VIGENTE', mensaje: 'Operaciones restringidas.' } },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(auth.estaAutenticado()).toBe(true);
    expect(TestBed.inject(EstadoPlanService).operacionesPermitidas()).toBe(false);
    http.post(`${API_BASE_URL}/api/v1/pagos/qr/confirmar/10`, {}).subscribe();
    backend.expectOne(`${API_BASE_URL}/api/v1/pagos/qr/confirmar/10`).flush({ estado: 'PAGADO' });
    http.post(`${API_BASE_URL}/api/v1/pagos/qr/checkout`, {}).subscribe({ error });
    backend.expectNone(`${API_BASE_URL}/api/v1/pagos/qr/checkout`);
  });
  it('actualiza una empresa reactivada sin conservar el bloqueo público anterior', () => {
    contexto.seleccionar({ id: 1, codigo: 'empresa-a', nombre: 'A', estado: 'SUSPENDIDA' });
    const estado = TestBed.inject(EstadoPlanService);
    expect(estado.operacionesPermitidas()).toBe(false);
    estado.aplicar(true);
    expect(estado.operacionesPermitidas()).toBe(true);
  });
  it('cierra una sesión inválida ante un 401 privado', () => {
    auth.guardarSesion(sesion());
    http.get(`${API_BASE_URL}/api/v1/carrito`).subscribe({ error: () => {} });
    backend
      .expectOne(`${API_BASE_URL}/api/v1/carrito`)
      .flush({ detail: 'Sesión vencida' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.estaAutenticado()).toBe(false);
    expect(localStorage.getItem('backend_tr_token')).toBeNull();
  });
  it('liga login y recuperación al código seleccionado', () => {
    auth.login({ identificador: 'ana', password: 'Prueba-local' }).subscribe();
    const login = backend.expectOne(`${API_BASE_URL}/api/v1/autenticacion/login`);
    expect(login.request.body.empresa_codigo).toBe('empresa-a');
    login.flush(sesion());
    auth.solicitarPasswordReset({ identificador: 'ana' }).subscribe();
    const reset = backend.expectOne(
      `${API_BASE_URL}/api/v1/autenticacion/password-reset/solicitar`,
    );
    expect(reset.request.body.empresa_codigo).toBe('empresa-a');
    reset.flush({ mensaje: 'OK' });
  });
  it('conserva la ruta solicitada cuando el servidor revoca las capacidades', () => {
    auth.guardarSesion(sesion());
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'currentNavigation').mockReturnValue({
      extractedUrl: { toString: () => '/usuarios' },
    } as unknown as ReturnType<Router['currentNavigation']>);
    http.get(`${API_BASE_URL}/api/v1/autenticacion/capacidades`).subscribe({ error: () => {} });
    backend
      .expectOne(`${API_BASE_URL}/api/v1/autenticacion/capacidades`)
      .flush({ detail: 'Acceso revocado' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.estaAutenticado()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/usuarios' },
    });
  });
  it('un 401 retrasado de la sesión anterior no cierra un nuevo ingreso', () => {
    auth.guardarSesion(sesion());
    http.get(`${API_BASE_URL}/api/v1/perfil`).subscribe({ error: () => {} });
    const pendiente = backend.expectOne(`${API_BASE_URL}/api/v1/perfil`);
    const nueva = sesion();
    nueva.access_token += 'firma-nueva';
    auth.guardarSesion(nueva);
    pendiente.flush(
      { detail: 'Sesión anterior revocada' },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(auth.obtenerToken()).toBe(nueva.access_token);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('lista empresas sin exponer credenciales ni cambiar la sesión seleccionada', () => {
    auth.guardarSesion(sesion());
    contexto.listar().subscribe();
    const r = backend.expectOne(`${API_BASE_URL}/api/v1/empresas/publicas`);
    expect(r.request.headers.has('Authorization')).toBe(false);
    expect(r.request.headers.has('X-Empresa-Codigo')).toBe(false);
    r.flush([{ id: 2, codigo: 'empresa-b', nombre: 'Empresa B', estado: 'ACTIVA' }]);
    expect(contexto.empresa()?.codigo).toBe('empresa-a');
    expect(auth.estaAutenticado()).toBe(true);
  });
  it('no resuelve códigos públicos con credenciales de la sesión anterior', () => {
    auth.guardarSesion(sesion());
    contexto.resolver('  EMPRESA-B ').subscribe();
    const r = backend.expectOne(`${API_BASE_URL}/api/v1/empresas/publica/empresa-b`);
    expect(r.request.headers.has('Authorization')).toBe(false);
    expect(r.request.headers.has('X-Empresa-Codigo')).toBe(false);
    r.flush({ id: 2, codigo: 'empresa-b', nombre: 'B', estado: 'ACTIVA' });
    expect(contexto.empresa()?.codigo).toBe('empresa-a');
  });
  it('rechaza sesiones anteriores sin empresa o expiradas', () => {
    const respuesta = sesion();
    const usuario = {
      id: 7,
      nombre: 'Ana',
      apellido: 'Prueba',
      username: 'ana',
      correo: 'ana@example.invalid',
      roles: ['CLIENTE'],
    };
    expect(sesionLocalValida(respuesta.access_token, usuario)).toBe(false);
    expect(
      sesionLocalValida('token-antiguo', {
        ...usuario,
        empresa_id: 1,
        empresa_codigo: 'empresa-a',
      }),
    ).toBe(false);
  });
});
