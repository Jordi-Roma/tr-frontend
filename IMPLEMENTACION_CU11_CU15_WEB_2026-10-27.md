# CU11–CU15 — Web

Se mantienen catálogo y carrito, con correcciones de accesibilidad y aviso de
prendas retiradas. Las reservas nuevas se presentan como gratuitas, sin
anticipo, con cita dentro de siete días y vencimiento informado por la API.
Las reservas anteriores conservan la presentación de su anticipo histórico.

El cajero puede acceder a la gestión de reservas de su sucursal, preparar,
atender y finalizar como venta. El selector ofrece solo transiciones válidas;
completar exige el cierre con prendas/cantidades y método de pago.
El detalle utiliza el modal compartido con foco, Escape y retorno al control.

Inventario y transferencias utilizan selectores comerciales autorizados.
El encargado trabaja con su sucursal como origen. Se incorpora búsqueda de
prendas por nombre/SKU y se protege el reenvío de solicitudes inciertas.

Ventas presenciales permite varias prendas, cliente identificado o consumidor
final, métodos de pago y descuentos manuales de administrador/encargado.
Cada venta dispone de descarga PDF y envío al correo registrado del cliente.
El administrador configura logo y condiciones para futuras notas de su empresa.
El backend vuelve a validar los importes y permisos al confirmar la venta.

La nota es comercial, sin facturación fiscal. CU19 definirá el plazo de cambio;
no se confunde con los siete días de reserva. CU14/CU15 no agregan pantallas
móviles. QR y probador conservan su recorrido.

Backend requerido: migración `2026_10_27_cu11_cu15_01`, mediante `init_db.py`.
Pruebas de navegador: `e2e/cu11-cu15.spec.ts`, con la fixture local desechable
descrita en `e2e/README.md`. El correo se captura en la fixture sin envíos reales.
No usar la base del negocio para estas pruebas.

## Verificación local

- 16 pruebas unitarias aprobadas y compilación de producción correcta.
- Siete recorridos CU11–CU15 aprobados con API y PostgreSQL reales desechables:
  catálogo/detalle, reserva gratuita/cancelación, atención por cajero, movimiento
  de inventario, venta con nota PDF/correo capturado, transferencia y condiciones
  de la empresa. Incluyen comprobaciones AXE, teclado y pantalla estrecha.
- Dos recorridos previos también aprobados: cambio de empresa que limpia estado
  y confirmación QR anterior.
- No se realizaron envíos reales ni se usó la base del negocio.
- Cambios locales; no se publicó este bloque.
