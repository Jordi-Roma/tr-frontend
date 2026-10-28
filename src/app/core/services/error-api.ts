import { HttpErrorResponse } from '@angular/common/http';

function registro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

export function detalleApi(error: unknown): unknown {
  const cuerpo: unknown = error instanceof HttpErrorResponse ? error.error : error;
  return registro(cuerpo) && 'detail' in cuerpo ? cuerpo['detail'] : cuerpo;
}

export function mensajeApi(
  error: unknown,
  fallback = 'No se pudo completar la solicitud.',
): string {
  const detalle = detalleApi(error);
  if (typeof detalle === 'string' && detalle.trim()) return detalle;
  if (registro(detalle) && typeof detalle['mensaje'] === 'string') return detalle['mensaje'];
  if (Array.isArray(detalle)) {
    const mensajes = detalle
      .filter(registro)
      .map((item) => item['msg'])
      .filter((msg): msg is string => typeof msg === 'string');
    if (mensajes.length) return mensajes.join(' ');
  }
  if (error instanceof HttpErrorResponse && error.status === 0)
    return 'No se pudo conectar. Revisa tu conexión e inténtalo nuevamente.';
  return fallback;
}

export function esErrorVigencia(error: unknown): boolean {
  const detalle = detalleApi(error);
  return (
    (registro(detalle) && detalle['codigo'] === 'SUSCRIPCION_NO_VIGENTE') ||
    /suscripci[oó]n no vigente/i.test(mensajeApi(error, ''))
  );
}

export function esOperacionNueva(metodo: string, ruta: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(metodo.toUpperCase())) return false;
  ruta = ruta.replace(/\/$/, '');
  if (ruta === '/api/v1/usuarios' || ruta.startsWith('/api/v1/usuarios/')) return false;
  if (
    ['/api/v1/saas/', '/api/v1/perfil', '/api/v1/autenticacion/', '/api/v1/devoluciones'].some(
      (prefijo) => ruta.startsWith(prefijo),
    )
  )
    return false;
  if (/^\/api\/v1\/pagos\/(qr\/confirmar|stripe\/confirmar-prueba)\/\d+$/.test(ruta)) return false;
  if (/^\/api\/v1\/ventas-presenciales\/\d+\/nota\/correo$/.test(ruta)) return false;
  if (
    /^\/api\/v1\/reservas\/\d+\/(cancelar|estado|anticipo\/stripe|finalizar|finalizar-venta)$/.test(
      ruta,
    )
  )
    return false;
  if (
    [
      '/api/v1/reportes/interpretar',
      '/api/v1/reportes/generar',
      '/api/v1/reportes/exportar/pdf',
      '/api/v1/reportes/exportar/excel',
    ].includes(ruta)
  )
    return false;
  if (/^\/api\/v1\/reportes\/programados\/\d+\/ejecutar$/.test(ruta)) return false;
  return metodo.toUpperCase() !== 'DELETE' && !ruta.endsWith('/desactivar');
}
