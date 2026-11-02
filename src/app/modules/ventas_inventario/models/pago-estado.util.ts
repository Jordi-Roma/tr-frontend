export type PagoEstadoVisual = {
  etiqueta: string;
  descripcion: string;
  clase: 'pagado' | 'pendiente' | 'rechazado' | 'neutro';
};

export function obtenerEstadoPagoVisual(estado: string | null | undefined): PagoEstadoVisual {
  const normalizado = (estado ?? '').toUpperCase();

  if (normalizado === 'REEMBOLSO_PENDIENTE') return { etiqueta: 'Reembolso pendiente', descripcion: 'Se recibió el pago, pero la compra no se completó. El reintegro aún no está confirmado.', clase: 'pendiente' };
  if (normalizado === 'REEMBOLSADO') return { etiqueta: 'Reembolsado', descripcion: 'El reintegro fue confirmado. La compra no se completó.', clase: 'neutro' };

  if (['PAGADO', 'COMPLETADO', 'COMPLETADA'].includes(normalizado)) {
    return {
      etiqueta: 'Aprobado',
      descripcion: 'El pago fue confirmado correctamente.',
      clase: 'pagado',
    };
  }

  if (normalizado === 'PENDIENTE') {
    return {
      etiqueta: 'Pendiente',
      descripcion: 'El pago todavía está esperando confirmación.',
      clase: 'pendiente',
    };
  }

  if (normalizado === 'RECHAZADO') {
    return {
      etiqueta: 'Rechazado',
      descripcion: 'La pasarela rechazó el pago o no pudo completarlo.',
      clase: 'rechazado',
    };
  }

  if (['CANCELADO', 'CANCELADA'].includes(normalizado)) {
    return {
      etiqueta: 'Cancelado',
      descripcion: 'El pago fue cancelado antes de completarse.',
      clase: 'rechazado',
    };
  }

  if (normalizado === 'EXPIRADO') {
    return {
      etiqueta: 'Expirado',
      descripcion: 'El tiempo para completar el pago venció.',
      clase: 'rechazado',
    };
  }

  if (normalizado === 'FALLIDO') {
    return {
      etiqueta: 'Fallido',
      descripcion: 'El pago no pudo procesarse correctamente.',
      clase: 'rechazado',
    };
  }

  return {
    etiqueta: normalizado || 'Sin estado',
    descripcion: 'Estado registrado por el sistema.',
    clase: 'neutro',
  };
}
