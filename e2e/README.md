# Pruebas multitenant en navegador

Estas pruebas usan Angular, FastAPI y PostgreSQL reales con datos ficticios. No utilizan Railway ni simulan las respuestas del backend. Playwright cambia únicamente el puerto de la API local y bloquea dominios externos; el QR usa el modo de prueba existente.

## Preparación

Requisitos: dependencias de `tr-frontend` instaladas con `npm ci`, entorno Python de `tr-backend` con sus dependencias de desarrollo, PostgreSQL 16 y Microsoft Edge instalado. Los puertos 55441, 58127 y 48123 deben estar libres.

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
