import { HttpErrorResponse } from '@angular/common/http';
import { esOperacionNueva, mensajeApi } from './error-api';

describe('Reglas de continuidad y errores de API', () => {
  it('mantiene consultas, pagos pendientes, devoluciones y reservas existentes', () => {
    for (const [metodo, ruta] of [
      ['GET', '/api/v1/categorias'],
      ['POST', '/api/v1/pagos/qr/confirmar/8'],
      ['POST', '/api/v1/reservas/8/anticipo/stripe'],
      ['POST', '/api/v1/devoluciones'],
      ['POST', '/api/v1/reportes/generar'],
      ['DELETE', '/api/v1/carrito/items/1'],
    ])
      expect(esOperacionNueva(metodo, ruta)).toBe(false);
    for (const ruta of [
      '/api/v1/pagos/stripe/checkout',
      '/api/v1/reservas/desde-carrito',
      '/api/v1/productos',
      '/api/v1/inventario/movimientos',
    ])
      expect(esOperacionNueva('POST', ruta)).toBe(true);
  });
  it('explica mensajes estructurados y validaciones sin mostrar objetos', () => {
    expect(
      mensajeApi(
        new HttpErrorResponse({
          status: 403,
          error: { detail: { codigo: 'X', mensaje: 'Límite alcanzado.' } },
        }),
      ),
    ).toBe('Límite alcanzado.');
    expect(mensajeApi({ detail: [{ msg: 'Fecha inválida.' }] })).toBe('Fecha inválida.');
  });
});
