import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { EmpresaContextoService } from './empresa-contexto.service';
import { EstadoPlanService } from './estado-plan.service';
import { CambioContextoService } from './cambio-contexto.service';

describe('Capacidades comerciales compartidas', () => {
  let estado: EstadoPlanService;
  let backend: HttpTestingController;
  const url = API_BASE_URL + '/api/v1/mi-empresa/capacidades';
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(EmpresaContextoService).seleccionar({
      id: 1,
      codigo: 'stylear',
      nombre: 'StyleAR',
      estado: 'ACTIVA',
    });
    estado = TestBed.inject(EstadoPlanService);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());
  it('comparte solicitudes y respeta habilitada, cupo cero y motivo', () => {
    estado.refrescar().subscribe();
    estado.refrescar().subscribe();
    backend
      .expectOne(url)
      .flush({
        empresa_id: 1,
        operaciones_habilitadas: false,
        funciones: {
          reportes_pdf: { incluida: true, habilitada: false, motivo: 'SUSCRIPCION_NO_VIGENTE' },
        },
        cupos: {
          usuarios: { limite: 0, uso: 1, disponibles: 0, agotado: true, motivo: 'CUPO_AGOTADO' },
        },
      });
    expect(estado.habilita('reportes_pdf')).toBe(false);
    expect(estado.operacionesPermitidas()).toBe(false);
    expect(estado.capacidades()?.cupos['usuarios'].disponibles).toBe(0);
    expect(estado.motivo('usuarios')).toContain('cupo');
    TestBed.inject(CambioContextoService).invalidar();
    expect(estado.capacidades()).toBeNull();
  });
  it('cancela la respuesta de una sesión anterior', () => {
    estado.refrescar().subscribe();
    const r = backend.expectOne(url);
    TestBed.inject(CambioContextoService).invalidar();
    expect(r.cancelled).toBe(true);
    expect(estado.capacidades()).toBeNull();
  });
});
