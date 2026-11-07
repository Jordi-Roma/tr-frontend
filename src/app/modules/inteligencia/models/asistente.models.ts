export const RECURSOS_CHAT = [
  'RESERVA',
  'VENTA',
  'ORDEN_PAGO',
  'DELIVERY',
  'CAMBIO',
  'DEVOLUCION',
  'REEMBOLSO_PAGO',
] as const;
export type RecursoChat = (typeof RECURSOS_CHAT)[number];
export interface AsistenteContexto {
  empresa_id?: number | null;
  variante_id?: number | null;
  recurso_tipo?: RecursoChat | null;
  recurso_id?: number | null;
  terminos?: string[];
  color_patrones?: string[];
  talla_patrones?: string[];
  precio_max?: number | null;
  producto_id?: number | null;
  sucursal_id?: number | null;
}

export interface AsistenteChatRequest {
  mensaje: string;
  contexto?: AsistenteContexto | null;
}

export interface AsistenteProducto {
  producto_id: number;
  nombre: string;
  categoria?: string | null;
  marca?: string | null;
  talla?: string | null;
  color?: string | null;
  sucursal?: string | null;
  ciudad?: string | null;
  stock_disponible?: number | null;
  stock_reservado?: number | null;
  stock_real?: number | null;
  precio_vigente?: number | null;
  precio_final?: number | null;
  precio_final_exacto?: string | null;
  moneda?: string;
  variante_id?: number | null;
  sucursal_id?: number | null;
  descripcion?: string | null;
  material?: string | null;
  promocion?: Record<string, unknown> | null;
  motivo?: string | null;
}

export interface AsistenteChatResponse {
  respuesta: string;
  tipo: string;
  productos: AsistenteProducto[];
  alternativas: AsistenteProducto[];
  acciones: Array<{
    tipo: string;
    label: string;
    url?: string | null;
  }>;
  filtros_detectados: Record<string, unknown>;
  requiere_login: boolean;
  fuentes: string[];
  consultado_en: string | null;
  datos: Record<string, unknown>[];
  contexto: AsistenteContexto | null;
  aclaracion: boolean;
  hay_mas: boolean;
}

export function precioChat(p: AsistenteProducto): string {
  const v = p.precio_final_exacto ?? p.precio_final ?? p.precio_vigente;
  return v == null ? 'Precio no disponible' : `${p.moneda ?? 'BOB'} ${v}`;
}
export function destinoChat(url: string | null | undefined): string | null {
  return url &&
    /^\/(?:catalogo|login|carrito|favoritos|para-ti|mis-pagos|mis-deliveries|reservas|cambios|mis-devoluciones|notificaciones|perfil|producto\/\d+|reservas\/\d+|mis-pagos\/\d+|mis-deliveries\/\d+)$/.test(
      url,
    )
    ? url
    : null;
}
const etiquetas: Record<string, string> = {
  fecha_expiracion: 'Vencimiento',
  fecha_pago: 'Fecha de pago',
  tiempo_estimado_min: 'Tiempo estimado registrado (min)',
  concepto: 'Concepto',
  plazo: 'Plazo (días)',
  condiciones: 'Condiciones',
  aceptado_en: 'Aceptado',
  cotizacion_vence: 'Vigencia de cotización',
  codigo: 'Código',
  estado: 'Estado registrado',
  importe: 'Importe',
  moneda: 'Moneda',
  fecha: 'Fecha',
  fecha_creacion: 'Registrado',
  fecha_cita: 'Cita',
  fecha_vencimiento: 'Vencimiento',
  vencimiento: 'Vencimiento',
  sucursal: 'Sucursal',
  nombre: 'Nombre',
  ciudad: 'Ciudad',
  direccion: 'Dirección publicada',
  telefono: 'Teléfono',
  fecha_reembolso: 'Fecha de reembolso',
  reembolso_confirmado: 'Reembolso confirmado',
  siguiente_paso: 'Siguiente paso',
  politica_aplicada: 'Política aplicada',
  plazo_cambios: 'Plazo para cambios',
  plazo_devoluciones: 'Plazo para devoluciones',
  condiciones_cambios: 'Condiciones de cambios',
  condiciones_devoluciones: 'Condiciones de devoluciones',
  cambios_habilitados: 'Cambios habilitados',
  devoluciones_habilitadas: 'Devoluciones habilitadas',
  modo: 'Modo de pagos',
  medios: 'Medios habilitados',
  diferencia: 'Diferencia',
  fecha_estimada: 'Estimación registrada',
  fecha_entrega: 'Entrega registrada',
};
export function datosChat(d: Record<string, unknown>): { label: string; valor: string }[] {
  const valor = (v: unknown): string =>
    v == null
      ? 'Sin dato'
      : typeof v === 'boolean'
        ? v
          ? 'Sí'
          : 'No'
        : Array.isArray(v)
          ? v.map(valor).join(', ')
          : typeof v === 'object'
            ? datosChat(v as Record<string, unknown>)
                .map((x) => x.label + ': ' + x.valor)
                .join('; ')
            : String(v);
  return Object.entries(d)
    .filter(([k]) => etiquetas[k])
    .map(([k, v]) => ({ label: etiquetas[k], valor: valor(v) }));
}
export function operacionChat(d: Record<string, unknown>): AsistenteContexto | null {
  return RECURSOS_CHAT.includes(d['recurso_tipo'] as RecursoChat) &&
    Number.isSafeInteger(d['id']) &&
    Number(d['id']) > 0
    ? { recurso_tipo: d['recurso_tipo'] as RecursoChat, recurso_id: Number(d['id']) }
    : null;
}
