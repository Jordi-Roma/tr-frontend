# Frontend multitenant y plataforma SaaS: implementación local

Fecha: 23 de octubre de 2026.

Se ejecutó `PLAN_FRONTEND_MULTITENANT_STYLEAR.md` en Angular. Los cambios están en el directorio de trabajo de `tr-frontend`, sin commit, push ni despliegue. Se conservaron los seis módulos existentes. Flutter queda como trabajo separado.

## Resultado funcional

- Entrada por `/empresa` y `/e/:codigo`, validación del código en el backend, nombre visible y contexto persistente. Un código inválido no recupera StyleAR ni datos de la empresa anterior.
- Login, registro y recuperación comerciales incluyen `empresa_codigo`. El acceso de Administrador SaaS está separado en `/saas/login` y no selecciona una empresa comercial.
- La sesión guarda empresa y código, invalida tokens locales antiguos y comprueba la correspondencia con la selección. Los encabezados de empresa y autorización se agregan únicamente a la API configurada.
- Cambiar de empresa con otra sesión abierta requiere una acción explícita de cierre. Se limpian carrito, favoritos y sucursal, se cancelan peticiones del contexto anterior y se invalidan sesiones desactualizadas entre pestañas.
- Se mantienen las rutas de negocio y los roles AD, ES, CA, PR, CL y visitante. AS tiene navegación propia; no puede abrir el negocio comercial. AD consulta roles globales, pero sus modificaciones corresponden a AS.
- La suspensión o el vencimiento conservan consultas, Mi plan, trámites de reservas existentes, devoluciones y confirmación de pagos pendientes. Se deshabilitan controles de operaciones nuevas y el interceptor respeta las excepciones del backend. Un 403 de vigencia conserva la sesión.
- Errores de permisos, cuotas, conflictos, validación y configuración privada se muestran con mensajes legibles, incluso cuando `detail` es un objeto o una lista.

## Pantallas dentro de administración

| Ruta | Acceso | Operaciones |
| --- | --- | --- |
| `/saas/empresas` | AS | Alta atómica de empresa, suscripción y administrador; edición de nombre; estado; asignación y renovación de plan |
| `/saas/planes` | AS | Alta y edición, cupos admitidos, funciones, tratamiento del plan legado y aviso de alcance compartido |
| `/saas/respaldos` | AS | Crear copia global/empresa; listar metadatos; previsualizar impacto; confirmar restauración con frase exacta; eliminar y aplicar conservación |
| `/saas/eventos` | AS | Auditoría de plataforma |
| `/mi-plan` | AD | Estado, fechas, cuotas, uso y funciones; disponible con restricciones |

Los formularios respetan la diferencia entre límite omitido y cero. No se inventaron precios ni cupos comerciales. Las contraseñas de altas no se persisten y se limpian al completar la operación. Los respaldos no tienen enlace público: la restauración global muestra que su destino es un entorno de ensayo vacío, y la selectiva exige suspender la empresa original.

## Probador y QR

No se modificaron las pantallas, servicios ni motor del probador o el contrato `imagen_resultado_url`. No se sustituyó su flujo por Base64.

La confirmación QR conserva el modal, el botón «Ya realicé el pago» y el recorrido anterior. Solo se aplicó la restricción de vigencia al inicio de una compra nueva. Se comprobó la confirmación de una orden pendiente después de suspender la empresa, usando el modo de pago de prueba del backend.

## Validación realizada

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | Correcto, compilación de producción |
| `npm test -- --watch=false` | 13 pruebas aprobadas en 3 archivos |
| `npm run test:e2e` | 15 pruebas aprobadas en Edge con FastAPI y PostgreSQL 16 reales, temporales y ficticios |
| Revalidación después de ajustes finales | 3 casos aprobados: selector, Mi plan suspendido y QR pendiente con suspensión |
| AXE | Sin infracciones en los recorridos analizados de selector, login, Empresas, Planes, Respaldos, Eventos y Mi plan |
| Teclado y diseño estrecho | Envío del selector con teclado y pantalla de 390 px comprobados |

Los casos de navegador comprobaron catálogos A/B, código inexistente, credenciales cruzadas, cierre explícito al cambiar, carrito limpio, ID de producto ajeno rechazado, roles comerciales, separación de AS, vencimiento y suspensión, creación/edición de planes, alta de empresa, restauración selectiva con catálogo de B intacto, respuesta tardía de A y cupo ocupado por otro operador sin duplicar el alta.

Las pruebas unitarias cubren además aislamiento de encabezados hacia otros dominios, cancelación de respuestas, limpieza de estado, sesiones anteriores, 401 y recuperación de operaciones tras reactivación. Las pruebas de concurrencia y de los cuatro catálogos del servidor siguen en la suite backend de la intervención anterior; el caso web de cupo representa otro operador que consume el último cupo mientras el formulario permanece abierto.

La compilación mantiene advertencias de optimización CommonJS de `leaflet` y `qrcode`. No son errores de compilación. Las comprobaciones AXE y de teclado corresponden a las pantallas y recorridos citados; no equivalen a una certificación de toda la aplicación heredada.

## Cómo repetir las pruebas

Consultar `e2e/README.md`. La fixture exige destino local `stylear_test_*` explícito, usa respaldos en una carpeta temporal y clave efímera, y bloquea servicios externos desde el navegador. No emplea fotos ni copias privadas reales. La configuración `.env` del proyecto no se modificó.

## Pendiente para publicación

1. Adaptar Flutter a selección de empresa, autenticación, encabezados y limpieza de estado, manteniendo el probador por URL.
2. Configurar ubicación privada, clave y conservación de respaldos del entorno definitivo; el destino global de ensayo también requiere configuración del operador.
3. Ensayar con una copia autorizada de datos reales y coordinar la publicación de backend, web y APK compatibles.
4. Comprobar los recorridos en el despliegue y los proveedores externos reales. No se hicieron cobros reales ni pruebas de generación de imagen/IA en esta validación.

No se modificó Railway ni su base de datos. Los cambios backend previos y los archivos móviles se conservaron.

## Actualización con el trabajo remoto de la compañera

El 23/10/2026 se actualizó `main` del frontend hasta `2bffaa0` y se recuperaron los cambios locales multitenant sin conflictos. Se conservó la eliminación remota del campo de enlace AR/3D en el formulario de productos. Después de integrar: compilación de producción correcta y 13 pruebas unitarias aprobadas. Los cambios multitenant permanecen pendientes de commit y push.

En una actualización separada se descargaron los tres commits pendientes de `tr-mobile` hasta `ad6852b`, conservando el vestidor en vivo, alternancia de cámaras y URL de Railway. Sus dependencias se prepararon respetando `pubspec.lock`, y `flutter analyze --no-pub` terminó sin incidencias. Flutter quedó sin modificaciones locales; esto no implementa todavía su adaptación multitenant ni comprueba cámara/Decart reales.
