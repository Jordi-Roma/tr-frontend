# CU04 y CU05 en web — StyleAR

23 de octubre de 2026. Cambios locales autorizados mediante «ejecuta» sobre el plan CU04/CU05.

- Usuarios de empresa: búsqueda, estados, paginación, alta/edición, desactivación/reactivación y asignación/retirada de roles. Las altas y concesiones se restringen con el plan; las revocaciones siguen disponibles.
- AS: `/saas/usuarios` distingue cuentas de plataforma y administradores de una empresa real seleccionada. Se cancelan respuestas anteriores y se vacía el listado al cambiar de ámbito.
- Roles: consulta AD; mantenimiento global AS. Nombres/semántica base y capacidades no configurables protegidos. Las nueve capacidades editables corresponden a controles reales del backend; los cambios globales requieren confirmación.
- Bitácora AD y AS: filtros por actor/acción/módulo/resultado/fechas, total/páginas y detalle real. Los eventos SaaS conservan su propia pantalla.
- Menús, guardias y botones utilizan capacidades del servidor. Se mantiene la sesión ante 403, se solicita nuevo acceso ante revocación y una respuesta tardía de una sesión anterior no cierra la nueva.
- Paneles con foco y teclado, área desplazable accesible, etiquetas y errores claros. Se conserva el directorio público de empresas y los flujos de perfil, pagos y QR.

Verificación: 16 pruebas unitarias aprobadas, 31 recorridos completos en Edge aprobados (ocho nuevos de CU04/CU05), controles AXE sin infracciones en las pantallas/formularios evaluados, foco/teclado y pantalla estrecha. Build de producción aprobado; conserva las advertencias CommonJS de Leaflet y qrcode.

Instrucciones para reproducir con base temporal: [e2e/README.md](e2e/README.md). Nuevos recorridos: [e2e/acceso.spec.ts](e2e/acceso.spec.ts). Los datos de prueba pertenecen exclusivamente a la fixture y no a las pantallas/migración.

El backend debe tener aplicada `2026_10_23_cu04_cu05_01` antes de utilizar esta web. No se hizo commit, push ni despliegue.

La matriz de permisos, contratos, migración, decisiones sobre auditoría/restauración y límites están en el [informe completo](../tr-backend/IMPLEMENTACION_CU04_CU05_2026-10-23.md).
