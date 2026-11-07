import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificacionesPage } from './notificaciones.page';
import { PagoService } from '../../services/pago.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import {
  CATEGORIAS_NOTIFICACION,
  CategoriaNotificacion,
  BandejaNotificaciones,
  rutaNotificacion,
} from '../../models/pago.models';
const categorias = Object.fromEntries(CATEGORIAS_NOTIFICACION.map((c) => [c, true])) as Record<
  CategoriaNotificacion,
  boolean
>;
const bandeja: BandejaNotificaciones = {
  avisos: [],
  total: 45,
  no_leidas: 27,
  pagina: 1,
  tamano: 20,
};
describe('CU27 bandeja', () => {
  const api = {
    bandejaNotificaciones: vi.fn(),
    leerTodasNotificaciones: vi.fn(),
    preferenciasNotificaciones: vi.fn(),
    guardarPreferenciasNotificaciones: vi.fn(),
  };
  beforeEach(() => {
    api.bandejaNotificaciones.mockReset().mockReturnValue(of(bandeja));
    api.leerTodasNotificaciones.mockReset().mockReturnValue(of({ actualizadas: 27 }));
    api.preferenciasNotificaciones.mockReturnValue(of({ categorias }));
    api.guardarPreferenciasNotificaciones.mockReset().mockReturnValue(of({ categorias }));
    TestBed.configureTestingModule({
      providers: [
        CambioContextoService,
        { provide: PagoService, useValue: api },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(NotificacionesPage, { set: { template: '', imports: [] } });
  });
  it('mantiene contador global aunque se filtre y consulta la página remota', () => {
    const c = TestBed.createComponent(NotificacionesPage).componentInstance;
    c['categoria'].set('RESERVA');
    c['cargar'](2);
    expect(api.bandejaNotificaciones).toHaveBeenLastCalledWith(2, null, 'RESERVA');
    expect(c['noLeidas']()).toBe(27);
    c['todas']();
    expect(api.leerTodasNotificaciones).toHaveBeenCalledOnce();
  });
  it('preferencias envía solo lo editado y conserva el formulario al fallar', () => {
    api.guardarPreferenciasNotificaciones.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    const c = TestBed.createComponent(NotificacionesPage).componentInstance;
    c['verPreferencias']();
    c['cambiarPreferencia']('COMPRA', { target: { checked: false } } as unknown as Event);
    c['guardarPreferencias']();
    expect(api.guardarPreferenciasNotificaciones).toHaveBeenCalledWith({ COMPRA: false });
    expect(c['preferencias']()?.COMPRA).toBe(false);
  });
  it('descarta respuestas de otra sesión y borra preferencias y contador', () => {
    const pendiente = new Subject<BandejaNotificaciones>();
    api.bandejaNotificaciones.mockReturnValue(pendiente);
    const c = TestBed.createComponent(NotificacionesPage).componentInstance;
    TestBed.inject(CambioContextoService).invalidar();
    pendiente.next({ ...bandeja, no_leidas: 99 });
    expect(c['noLeidas']()).toBe(0);
    expect(c['notas']()).toEqual([]);
    expect(c['preferencias']()).toBeNull();
  });
  it('venta y pago se distinguen; rechaza destinos no disponibles', () => {
    expect(
      rutaNotificacion({
        disponible: true,
        accion: 'VER_DETALLE',
        recurso_tipo: 'VENTA',
        recurso_id: 5,
      }),
    ).toBeNull();
    expect(
      rutaNotificacion({
        disponible: true,
        accion: 'VER_DETALLE',
        recurso_tipo: 'ORDEN_PAGO',
        recurso_id: 5,
      }),
    ).toBe('/mis-pagos/5');
    expect(
      rutaNotificacion({
        disponible: false,
        accion: 'ABRIR_BANDEJA',
        recurso_tipo: 'RESERVA',
        recurso_id: 1,
      }),
    ).toBeNull();
  });
});
