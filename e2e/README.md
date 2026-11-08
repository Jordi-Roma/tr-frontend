# Pruebas multitenant en navegador

Estas pruebas usan Angular, FastAPI y PostgreSQL reales con datos ficticios. No utilizan Railway ni simulan las respuestas del backend. Playwright cambia únicamente el puerto de la API local y bloquea dominios externos; el QR usa el modo de prueba existente.

Para correr todos los archivos sin compartir carritos, ventas, reservas ni planes
entre ellos, usa `run_isolated.py` desde `tr-frontend`. Prepara el clúster
desechable de abajo y ejecuta el inicializador sobre la base vacía. Usa esa base
migrada como plantilla antes de iniciar `backend_fixture.py`.

```powershell
$env:PATH = "$pgBin;$env:PATH"
$env:STYLEAR_E2E_TEMPLATE_DATABASE_URL = 'postgresql://stylear_test@127.0.0.1:55441/stylear_test_frontend'
& '..\tr-backend\venv\Scripts\python.exe' e2e/run_isolated.py
```

El ejecutor arranca Angular una vez, clona la plantilla por archivo y activa el
modo de datos que ese archivo requiere. Elimina sus clones al terminar y deja
las trazas en carpetas separadas dentro de `test-results`. Para ejecutar solo
algunos grupos, pasa sus nombres, por ejemplo `cu22-reportes.spec.ts`.

## Preparación

Requisitos: dependencias de `tr-frontend` instaladas con `npm ci`, entorno Python de `tr-backend` con sus dependencias de desarrollo, PostgreSQL 16 y Microsoft Edge instalado. Los puertos 55441, 18127 y 48123 deben estar libres.

Crear un clúster **nuevo y desechable**, en PowerShell desde `TiendaAR`:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\16\bin'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('stylear-front-' + [guid]::NewGuid().ToString('N'))
$testData = Join-Path $testRoot 'data'
New-Item -ItemType Directory -Path $testRoot | Out-Null
& "$pgBin\initdb.exe" -D $testData -U stylear_test -A trust --encoding=UTF8 --no-locale
& "$pgBin\pg_ctl.exe" -D $testData -l (Join-Path $testRoot 'postgres.log') -o '-h 127.0.0.1 -p 55441' -w start
& "$pgBin\createdb.exe" -h 127.0.0.1 -p 55441 -U stylear_test stylear_test_frontend
$env:STYLEAR_TEST_DATABASE_URL = 'postgresql://stylear_test@127.0.0.1:55441/stylear_test_frontend'
$env:DATABASE_URL = $env:STYLEAR_TEST_DATABASE_URL
& '.\tr-backend\venv\Scripts\python.exe' '.\tr-backend\init_db.py'
& '.\tr-backend\venv\Scripts\python.exe' '.\tr-frontend\e2e\backend_fixture.py'
```

Revisar que cada preparación terminó correctamente antes del siguiente paso. Mantener abierta esa terminal mientras corre la API. La fixture rechaza destinos sin host `127.0.0.1`, sin nombre `stylear_test_*` o con variables de destino diferentes. Crea dos empresas, sus cuentas, sucursales y prendas. El archivo `.fixture.json` es temporal y está excluido de Git; no contiene tokens ni contraseñas reales.

En otra terminal, desde `tr-frontend`:

```powershell
npm run test:e2e
```

La configuración inicia y cierra Angular automáticamente. Se ejecutan 31 casos en Edge: 17 recorridos multitenant, seis de cuenta/perfil y ocho de usuarios, roles y bitácora (CU04/CU05). Hay controles AXE en directorio, login, pantallas SaaS, Mi plan, perfil y sus formularios, recuperación y desactivación. También se comprueban teclado/foco, pantalla estrecha, direcciones, cambios de identidad y contraseña, cierre de sesión y recuperación con código. CU04/CU05 verifica estados de cuentas, vínculos al asignar roles, protección de plantillas, retirada efectiva de permisos, separación de ámbitos AS/AD, filtros/detalle de auditoría y descarte de respuestas de otra empresa. Las capturas y trazas de fallos quedan en `test-results/`, excluido de Git.

La fixture captura el correo exclusivamente en `e2e/.correos.json`, ignorado por Git, para cuentas sintéticas `@example.invalid`; no usa SMTP ni crea endpoints adicionales. Al cerrar las pruebas se debe borrar ese archivo junto a `.fixture.json`. No ejecutar simultáneamente la suite backend y el navegador contra la misma base: las pruebas de restauración detectan correctamente cualquier cambio de referencias globales. Usar otra base desechable para el backend.

## Cierre

Detener la API con Ctrl+C en la primera terminal. Los respaldos cifrados, clave efímera y carpeta de archivos ficticios se limpian al terminar la fixture. En esa misma terminal detener PostgreSQL:

```powershell
& "$pgBin\pg_ctl.exe" -D $testData -m fast -w stop
Remove-Item -LiteralPath '.\tr-frontend\e2e\.fixture.json' -ErrorAction SilentlyContinue
Remove-Item -LiteralPath '.\tr-frontend\e2e\.correos.json' -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL, Env:STYLEAR_TEST_DATABASE_URL -ErrorAction SilentlyContinue
```

La carpeta exacta indicada por `$testRoot` puede eliminarse después de comprobar que corresponde al clúster desechable recién creado y que PostgreSQL está detenido. No reutilizar estos comandos contra una base existente ni reemplazar el destino con la configuración `.env` del proyecto.

## Otras verificaciones

CU06 agrega dos recorridos en `cu06.spec.ts` para ciudades y sucursales por
empresa, edición, desactivación/reactivación y accesibilidad de listas/formularios.
El recorrido de ciudades verifica también Escape, retorno de foco y tabulación
dentro del modal. Para ejecutarlos de forma aislada con la fixture anterior activa:

```powershell
npm run test:e2e -- e2e/cu06.spec.ts
```

La fixture crea ciudades propias para cada empresa. Si se usa el entorno local
preparado en esta conversación, el ejecutable Python está en
`tr-backend\.venv\Scripts\python.exe`.

```powershell
npm test -- --watch=false
npm run build
```

El build de producción incluye fuentes externas y puede necesitar red. La suite de navegador verifica pagos de prueba; no efectúa cobros ni prueba proveedores externos de imagen/IA. La prueba de cupo reproduce un formulario abierto cuyo último cupo consume otro operador antes del envío; la serialización concurrente del servidor también tiene pruebas en `tr-backend/tests/test_multitenant_integration.py`.

## CU11–CU15

`cu11-cu15.spec.ts` agrega siete recorridos de catálogo, carrito, reserva gratuita
por siete días, atención por cajero, inventario, transferencia, venta presencial
y configuración/descarga/envío de notas de la empresa. Incluye AXE y utiliza la
misma fixture con PostgreSQL real desechable. El envío PDF se intercepta dentro
del proceso de fixture, exclusivamente para correos `@example.invalid`; no se
cambia el proveedor de correo de la aplicación desplegada.

```powershell
npm run test:e2e -- e2e/cu11-cu15.spec.ts
```

Aplicar primero la migración `2026_10_27_cu11_cu15_01` mediante el inicializador
en el destino de pruebas. La fixture usa almacenamiento temporal también para
los logos de notas. No ejecutar esta suite contra la base del negocio.

## Registro público de empresas — CU01/CU26

La suite `registro-empresa.spec.ts` verifica publicación de un plan por el AS,
registro sin SMTP ni verificación de correo, ocultamiento de la empresa pendiente,
aprobación en la interfaz y acceso posterior de su administrador. También simula
una respuesta perdida para confirmar que el reintento no duplica el alta ni cambia
la sesión de otra tienda. Incluye AXE y el estado sin planes en pantalla estrecha.

```powershell
npm run test:e2e -- e2e/registro-empresa.spec.ts
```

Requiere la migración `2026_10_28_registro_empresa_01` en la base desechable de la
fixture. Se publica únicamente el plan sintético de esa base; no se crean planes
ni empresas de muestra en la aplicación real.

## CU25 — Respaldos por empresa y plataforma

`cu25-respaldos.spec.ts` usa las pantallas reales, PostgreSQL y cifrado reales, y un R2 en memoria. El modo requiere `STYLEAR_E2E_RESPALDOS=1`; desactiva los ejecutores automáticos de respaldos, reportes y push de la fixture, de modo que solo corran las operaciones explícitas del recorrido.

Antes de iniciar `backend_fixture.py`, crear una segunda base **vacía**, local y desechable para la restauración global. Por ejemplo, con el clúster de pruebas de esta guía:

```powershell
& "$pgBin\createdb.exe" -h 127.0.0.1 -p 55441 -U stylear_test stylear_test_frontend_ensayo
$env:STYLEAR_E2E_RESPALDOS = '1'
$env:STYLEAR_E2E_RESTORE_DATABASE_URL = 'postgresql://stylear_test@127.0.0.1:55441/stylear_test_frontend_ensayo'
```

La fixture exige destinos `127.0.0.1`, nombres `stylear_test_*` y bases distintas. Configura una carpeta de ensayo temporal separada. No utiliza credenciales ni buckets reales. Iniciar la fixture como se indica arriba y después ejecutar:

```powershell
npm run test:e2e -- e2e/cu25-respaldos.spec.ts
```

El recorrido prueba cuota móvil, eliminación sin liberar cupo, horario fijo, separación A/B, restauración de empresa suspendida, frase explícita (Enter no restaura), cierre de sesiones, conservación de la suscripción actual, copia preventiva, restauración global al ensayo vacío y conservación de la sesión SaaS. Incluye AXE y pantalla estrecha. Una restauración global deja el ensayo poblado: para repetir todo el recorrido, crear otro destino vacío o volver a preparar únicamente ese entorno desechable. Al terminar, detener la fixture y retirar ambas bases de pruebas y sus variables; nunca usar la base local de trabajo como destino.


## CU22 — Dashboard y reportes paginados

Sobre una base local **desechable**, preparada con las migraciones de esta guía, iniciar la fixture con `STYLEAR_E2E_REPORTES=1` y ejecutar `npm run test:e2e -- e2e/cu22-reportes.spec.ts`.
El modo agrega 5.200 ventas sintéticas, desactiva ejecutores automáticos de reportes/respaldos/push, usa interpretación local y captura los adjuntos PDF/Excel sin SMTP. No consulta proveedores externos. Mantiene los controles de destino `127.0.0.1` y base `stylear_test_*`.
Los recorridos verifican totales completos, páginas remotas de 20 filas, filtros conservados al paginar/exportar, límite de exportación, comparación sin porcentaje con base cero, edición con revisión/409 y conservación de pausa, activación/envío/historial y alcance del encargado. Incluyen AXE y vista estrecha. Retirar la base desechable y los JSON de fixture al terminar.


## CU23–CU24 — Recomendaciones y asistente

Preparar una base local desechable siguiendo esta guía e iniciar `backend_fixture.py` con `STYLEAR_E2E_INTELIGENCIA=1`. Ejecutar `npm run test:e2e -- e2e/cu23-cu24.spec.ts`.
La fixture agrega dos reservas del cliente A y una promoción del 20 %, usa RULES para el asistente y prohíbe generar embeddings externos. Los ejecutores de reportes/respaldos/push quedan desactivados exclusivamente en este modo. No indexa ni envía mensajes reales.
El recorrido verifica desactivar personalización conservando favoritos, precio final, contexto entre turnos, elección explícita de reserva, vencimiento y aislamiento de producto/cliente entre empresas; incluye AXE y vista estrecha. Detener la fixture y retirar la base y los JSON de prueba al finalizar.


## CU27 — Bandeja, preferencias y destinos

En una base local desechable con las migraciones vigentes, iniciar la fixture con `STYLEAR_E2E_INTELIGENCIA=1` y `STYLEAR_E2E_NOTIFICACIONES=1`; ejecutar `npm run test:e2e -- e2e/cu27-notificaciones.spec.ts`.
La fixture agrega más de 40 avisos, una compra y reservas propias de A y un aviso de B. Mantiene los ejecutores automáticos desactivados. El recorrido prueba páginas de 20, contador no leído global, marcado de todas fuera del filtro/página, preferencias parciales que conservan cambios concurrentes, trazabilidad, compra sin confundirla con pago, destino de reserva autorizado y 404 sobre avisos de B; incluye AXE y vista estrecha.
Para pruebas de interfaz no se necesitan claves Firebase reales. Las pruebas físicas son separadas y deliberadas: registrar solo el teléfono del responsable en la cuenta sintética, verificar un único dispositivo activo y procesar solo un aviso controlado. No habilitar trabajadores automáticos ni enviar a otras cuentas para probar la UI. Retirar el dispositivo de ensayo, la base y los JSON al terminar.
