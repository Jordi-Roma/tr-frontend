# CU21 · PWA y operación offline de StyleAR

Plan para implementar en `tr-frontend` el acceso instalable y el trabajo sin conexión en una computadora compartida. Cubre las secciones 5 y 7 del enunciado del segundo parcial, la tecnología web de la sección 11 y los requisitos RNF03 a RNF06.

## 1. Qué podrá hacer el usuario

- Instalar StyleAR una vez en el navegador de la computadora. El ícono abrirá el directorio de empresas en `/empresa`, que ya es el destino de la raíz.
- Con internet, elegir su empresa e iniciar sesión con su propia cuenta. Tras habilitar el acceso offline, la web carga y guarda automáticamente el catálogo autorizado y el historial reciente. El usuario no tiene que descargar archivos.
- Sin internet, abrir la PWA, desbloquear el acceso local habilitado para su cuenta y consultar el catálogo descargado, los últimos precios y existencias conocidos y las operaciones recientes.
- Registrar una reserva como cliente o una venta presencial en efectivo como personal autorizado. Guardar la operación aunque se cierre o recargue la PWA. Mostrar cuándo se actualizó el catálogo por última vez.
- Al recuperar la conexión, consultar el estado de cada operación y sincronizarla con la misma API que usa el APK.

## 2. Manifiesto e instalación

Crear `public/manifest.webmanifest` y enlazarlo desde `src/index.html`. Configurar un manifiesto por despliegue de StyleAR, con `name` y `short_name` en **StyleAR**, `id` estable, `start_url` en `/empresa`, `scope` en `/` y `display` en `standalone`. Reutilizar la identidad visual y los colores del proyecto. Preparar íconos de 192 y 512 píxeles, incluyendo una versión adaptable para los navegadores que la usen. El manifiesto es común a todas las empresas y no lleva datos de sesión. [Especificación del manifiesto web](https://www.w3.org/TR/appmanifest/)

Verificar la instalación en el navegador objetivo de la computadora compartida. Abrir la PWA desde el ícono y comprobar que entra al directorio. En Railway, servir la PWA por HTTPS y configurar la entrega de `index.html` para las rutas de Angular, incluida `/empresa`.

## 3. Service Worker y arranque offline

Integrar el Service Worker oficial de Angular con una versión compatible con la del proyecto. Registrar el trabajador desde `src/app/app.config.ts` y configurar el build en `angular.json` y los recursos en `ngsw-config.json`. Probar con la compilación de producción servida en localhost o HTTPS. [Configuración de Angular PWA](https://angular.dev/ecosystem/service-workers/getting-started)

- Precargar la interfaz base, estilos, íconos y los archivos necesarios para abrir el directorio, desbloquear el acceso offline y navegar por catálogo, historial y registro. Incluir los recursos de las rutas cargadas bajo demanda que se necesitan en el recorrido offline.
- Limitar el caché del Service Worker a recursos de la aplicación. Mantener las respuestas autenticadas, el catálogo privado y las operaciones en IndexedDB. Asegurar que el arranque offline tampoco dependa de fuentes o íconos externos.
- En `/empresa`, mostrar el directorio normal con conexión. Si la red falla, ofrecer el desbloqueo de la cuenta local habilitada. Si el navegador nunca preparó la PWA o no tiene un acceso offline habilitado, explicar que debe conectarse primero.
- Mostrar **Listo para trabajar sin conexión** solo cuando el Service Worker controle la página y se haya guardado una primera descarga válida. Ofrecer las actualizaciones de la PWA sin perder operaciones ni recargar un formulario en edición. [Configuración del caché de Angular](https://angular.dev/ecosystem/service-workers/config)

## 4. Acceso en una computadora compartida

El primer inicio de sesión de cada empleado y el cambio de cuenta o empresa requieren internet. Habilitar el acceso local es una acción expresa, después de verificar la sesión con el servidor. En una computadora donde todos comparten navegador, el acceso offline usará una **frase de acceso propia de cada cuenta**, distinta de la contraseña de StyleAR. La frase es una propuesta de implementación para este entorno y evita depender de un PIN del sistema que todos conozcan. Ofrecer una frase aleatoria y exigir suficiente longitud para proteger los datos si alguien copia el almacenamiento del navegador. [Derivación de claves y resistencia a intentos de adivinación](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

- Cifrar el catálogo privado, el historial y las operaciones de cada cuenta con Web Crypto. Usar una clave de datos aleatoria por ámbito y protegerla con una clave derivada de la frase mediante PBKDF2 con sal aleatoria y parámetros versionados. Usar cifrado autenticado AES-GCM con un IV nuevo por cifrado y asociar el contenido a su ámbito. Conservar en IndexedDB los datos cifrados y la clave de datos envuelta. Mantener la clave abierta solo en memoria. [Web Crypto de W3C](https://www.w3.org/TR/webcrypto/)
- Separar los datos por empresa y usuario, y aplicar el alcance de sucursal en las consultas. Un usuario con acceso a varias sucursales puede elegir entre sus sucursales descargadas. El cajero y el encargado se limitan a las autorizadas por el backend.
- Distinguir **Bloquear** de **Cerrar sesión**. Bloquear por inactividad o al abandonar el turno retira de memoria el contenido descifrado. Reabrir sin internet permite desbloquear únicamente la cuenta habilitada. Como criterio inicial, el permiso offline vence 24 horas después de la última verificación en línea.
- Al cerrar sesión, deshabilitar el desbloqueo offline y retirar la sesión y los datos visibles en todas las pestañas de ese navegador. Conservar cifradas las operaciones pendientes de esa cuenta. Cuando el mismo usuario vuelva a autenticarse, puede desbloquearlas con su frase y sincronizarlas. Si pierde la frase, el backend no puede recuperar operaciones que todavía existen solo cifradas en esa computadora.
- Revisar `AuthService`, que actualmente guarda el token y el perfil en `localStorage`. Para el modo compartido, migrar la sesión en línea a almacenamiento en memoria y retirar las copias persistentes del token y del perfil. El permiso local únicamente abre los datos del navegador. Para sincronizar se requiere una sesión de servidor válida, con nueva autenticación si venció o se cerró.
- Al detectar una revocación, cambio de empresa, cuenta suspendida o cambios de permisos, bloquear el acceso correspondiente y descartar respuestas tardías del contexto anterior. Al descargar permisos nuevos, retirar el catálogo y el historial que queden fuera del alcance, conservando la cola de su titular.

## 5. Datos en IndexedDB

| Almacén | Contenido |
|---|---|
| Accesos locales | Ámbito, vigencia, estado de habilitación y metadatos necesarios para desbloquear los datos de esa cuenta. |
| Catálogo por sucursal | Productos, variantes, tallas, colores, precio vigente y stock de la última descarga. |
| Historial reciente | Reservas y ventas autorizadas, sus detalles disponibles, IDs de servidor y fecha de última actualización. |
| Cola de operaciones | UUID, tipo, ámbito, sucursal, fecha local, líneas, importes en centavos, estado, intentos y resultado. |

Versionar el esquema de IndexedDB. Descargar por páginas y publicar la nueva copia en una transacción cuando se haya completado. Si la descarga se interrumpe, conservar la copia anterior. Aplicar bajas y cambios de alcance al refrescar. Limitar el volumen de catálogo y de historial y mantener aparte la cola para que una limpieza de caché o una actualización de la PWA no descarte envíos pendientes. Mostrar un error de guardado si el navegador no permite persistir la operación. Borrar los datos del sitio desde el navegador elimina las operaciones que todavía existan solo ahí. [IndexedDB de W3C](https://www.w3.org/TR/IndexedDB/)

## 6. Sincronización con el backend existente

El navegador usa FastAPI para leer y registrar datos en PostgreSQL. Reutilizar el interceptor de autenticación y contexto de empresa. Aunque las rutas de descarga se llamen `operacion-movil`, sus contratos también sirven para la PWA.

| Función | Ruta existente en el backend local |
|---|---|
| Verificar sesión y permisos | `GET /api/v1/perfil` |
| Descargar sucursales y catálogo | `GET /api/v1/operacion-movil/sucursales` y `GET /api/v1/operacion-movil/catalogo?sucursal_id=…&desde=…` |
| Descargar historial | `GET /api/v1/reservas/mis-reservas?limite=30` y `GET /api/v1/pagos/mis-pagos?limite=30` para clientes. Para personal autorizado, `GET /api/v1/reservas?limite=30&incluir_finalizadas=true` y `GET /api/v1/ventas-presenciales?limite=30`. |
| Sincronizar reserva | `POST /api/v1/reservas/offline` con `clave_operacion`, sucursal, fecha de cita y variantes con cantidades. |
| Sincronizar venta de contado | `POST /api/v1/ventas-presenciales/offline` con `clave_operacion`, sucursal, método `EFECTIVO`, efectivo recibido y variantes con cantidades y precios en centavos. |

1. Al confirmar un formulario, generar un UUID, bloquear pulsaciones repetidas y guardar los datos en IndexedDB. Mostrar **Pendiente** después de confirmar la escritura local. Veinte pulsaciones del mismo envío dejan una sola operación.
2. Al reconectar, comprobar la sesión y procesar únicamente la cola de la cuenta activa y desbloqueada. Permitir también **Reintentar**. Usar un reclamo por operación en IndexedDB con vencimiento para coordinar pestañas y recuperar envíos interrumpidos.
3. Ante un corte, timeout o fallo temporal, conservar el registro y reintentar con el mismo UUID y los mismos datos. Si el servidor ya procesó la operación, devuelve el resultado registrado. Guardar la respuesta y fusionar el registro local con el historial para que aparezca una sola vez.
4. El servidor verifica empresa, sucursal, permisos, precio y stock. Al confirmar una venta, registra la venta y el movimiento de inventario en la misma transacción. Una reserva aceptada compromete disponibilidad. Un conflicto queda visible con su motivo y conserva la información del efectivo recibido.
5. Si se rechazó una venta con efectivo recibido, el cajero devuelve el dinero y registra la devolución. Para pagos electrónicos, Stripe y QR siguen en el flujo con conexión. Si ya se confirmó un cobro electrónico y el servidor rechaza definitivamente la compra, usar el flujo de reembolso existente y emitir el aviso de CU27 al confirmarse la devolución. Una respuesta perdida se concilia antes de tramitar un reembolso.

Para probar desde Railway, desplegar el backend del CU21 y aplicar `2026_11_08_cu21_offline` mediante `init_db.py` antes de publicar la PWA que use estas rutas. Para el trabajo local, probar con PostgreSQL desechable y cuentas ficticias.

## 7. Integración y orden de trabajo

1. **Instalación y arranque.** Preparar manifiesto, íconos y Service Worker. Mantener `src/app/app.routes.ts` y la página de empresa como entrada. Agregar ahí el estado de arranque offline.
2. **Sesión y base local.** Integrar el bloqueo y el desbloqueo con `src/app/modules/autenticacion/services/auth.service.ts`, el contexto de empresa, las guardas y el interceptor. Mantener los servicios de IndexedDB y sincronización en `src/app/core`.
3. **Pantallas comerciales.** Reutilizar el catálogo de `catalogo`, el carrito y el historial de `reservas` y la pantalla `venta-presencial` de `ventas_inventario`. Mostrar stock conocido, fecha de actualización, estados y motivos de rechazo. Mantener el acceso a la cola visible desde el flujo comercial.
4. **Pruebas.** Verificar instalación y apertura desde el ícono. Preparar la PWA con conexión, cortar internet, cerrar y abrirla, desbloquear, consultar historial y registrar una reserva y una venta en efectivo. Probar veinte pulsaciones, dos pestañas, respuesta perdida tras confirmar, última unidad vendida por otro usuario, precio cambiado y actualización del Service Worker con operaciones pendientes. En la misma computadora, comprobar que el cajero B no pueda abrir los datos ni sincronizar las operaciones del cajero A.
5. **Demostración.** Mostrar una operación pendiente con internet desactivado y la misma operación confirmada al reconectar. Verificar en PostgreSQL que haya una sola venta y un solo conjunto de movimientos de inventario para ese UUID. Ejecutar pruebas automatizadas y un recorrido en Edge o Chrome con la compilación de producción.
