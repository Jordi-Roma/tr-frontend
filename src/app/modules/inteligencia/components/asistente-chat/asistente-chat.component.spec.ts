import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { vi } from 'vitest';
import { AsistenteChatComponent } from './asistente-chat.component';
import { AsistenteService } from '../../services/asistente.service';
import {
  AsistenteChatResponse,
  precioChat,
  destinoChat,
  operacionChat,
  datosChat,
} from '../../models/asistente.models';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
const respuesta: AsistenteChatResponse = {
  respuesta: 'Disponible',
  tipo: 'catalogo',
  productos: [],
  alternativas: [],
  acciones: [],
  filtros_detectados: {},
  requiere_login: false,
  fuentes: [],
  consultado_en: null,
  datos: [],
  contexto: { producto_id: 3, talla_patrones: ['m'], empresa_id: 1 },
  aclaracion: false,
  hay_mas: false,
};
describe('CU24 conversación', () => {
  const chat = vi.fn();
  beforeEach(() => {
    chat.mockReset().mockReturnValue(of(respuesta));
    TestBed.configureTestingModule({
      providers: [
        CambioContextoService,
        { provide: AsistenteService, useValue: { chat, seleccion: signal(null) } },
      ],
    });
    TestBed.overrideComponent(AsistenteChatComponent, { set: { template: '', imports: [] } });
  });
  it('reenvía contexto devuelto, y selecciona operaciones por tipo e ID', () => {
    const c = TestBed.createComponent(AsistenteChatComponent).componentInstance;
    c['texto'].set('Prenda en M');
    c['enviar']();
    c['texto'].set('¿y en negro?');
    c['enviar']();
    expect(chat).toHaveBeenLastCalledWith({
      mensaje: '¿y en negro?',
      contexto: respuesta.contexto,
    });
    c['seleccionarOperacion']({ recurso_tipo: 'ORDEN_PAGO', id: 8 });
    expect(c['contexto']()).toEqual({ recurso_tipo: 'ORDEN_PAGO', recurso_id: 8 });
  });
  it('cambiar cuenta borra datos y descarta una respuesta anterior', () => {
    const pendiente = new Subject<AsistenteChatResponse>();
    chat.mockReturnValue(pendiente);
    const c = TestBed.createComponent(AsistenteChatComponent).componentInstance;
    c['texto'].set('Mis reservas');
    c['enviar']();
    TestBed.inject(CambioContextoService).invalidar();
    pendiente.next(respuesta);
    expect(c['mensajes']()).toEqual([]);
    expect(c['contexto']()).toBeNull();
  });
  it('429 conserva mensaje y bloquea repetir durante Retry-After sin reintentar solo', () => {
    chat.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '5' }) }),
      ),
    );
    const c = TestBed.createComponent(AsistenteChatComponent).componentInstance;
    c['texto'].set('Consulta');
    c['enviar']();
    c['enviar']();
    expect(chat).toHaveBeenCalledOnce();
    expect(c['texto']()).toBe('Consulta');
    expect(c['error']()).toContain('5 segundos');
  });
  it('precio exacto y cero válidos; URLs y selección arbitrarias no se aceptan', () => {
    expect(
      precioChat({ producto_id: 1, nombre: 'Prenda', precio_final: 0, precio_vigente: 50 }),
    ).toBe('BOB 0');
    expect(
      precioChat({
        producto_id: 1,
        nombre: 'Prenda',
        precio_final_exacto: '40.00',
        precio_vigente: 50,
      }),
    ).toBe('BOB 40.00');
    expect(precioChat({ producto_id: 1, nombre: 'Prenda' })).toBe('Precio no disponible');
    for (const url of [
      'https://evil.test',
      '//evil.test',
      '/mis-pagos/1?url=externo',
      '/saas/planes',
    ])
      expect(destinoChat(url)).toBeNull();
    expect(operacionChat({ recurso_tipo: 'VENTA', id: 7 })).toEqual({
      recurso_tipo: 'VENTA',
      recurso_id: 7,
    });
    expect(operacionChat({ recurso_tipo: 'ADMIN', id: 7 })).toBeNull();
    expect(datosChat({ reembolso_confirmado: false, token: 'privado' })).toEqual([
      { label: 'Reembolso confirmado', valor: 'No' },
    ]);
  });
});
