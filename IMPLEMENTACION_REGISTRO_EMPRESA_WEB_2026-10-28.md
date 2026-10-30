# Registro público de empresas — Web

La entrada pública `/empresa` incorpora «Crear mi empresa», que abre
`/crear-empresa`. El visitante elige entre los planes activos publicados por el
administrador SaaS y completa los datos de empresa y de su cuenta administradora.

El registro **no envía correo ni exige códigos o enlaces de verificación**.
La empresa y la suscripción quedan pendientes de aprobación; no aparecen en el
directorio ni permiten iniciar sesión hasta que el AS las activa desde Empresas,
confirmando el plan y su vigencia. El panel identifica el contacto como correo
sin verificar. Cancelar una solicitud conserva el historial.

La pantalla usa un cliente HTTP público independiente: no adjunta ni modifica
la sesión de otra empresa. Conserva una clave de reintento en memoria si se
pierde la respuesta y no guarda contraseñas en el almacenamiento del navegador.
Se mantiene la unicidad global existente de usuarios y correos.

El panel Planes agrega «Disponible en el registro de empresas». Los planes
existentes comienzan privados y el plan de transición no puede publicarse.
Debe publicarse al menos un plan para permitir solicitudes reales. No se crean
planes de ejemplo ni precios comerciales automáticamente.

Backend requerido: migración `2026_10_28_registro_empresa_01`, aplicada mediante
`init_db.py`. La publicación debe incluir backend y frontend actualizados.

Verificación local: 16 pruebas unitarias aprobadas y siete recorridos distintos
de navegador aprobados en tandas, incluidos cuatro nuevos de registro, con AXE,
teclado y pantalla estrecha. Se conserva el alcance de las funciones anteriores.
Las pruebas usan API y PostgreSQL reales desechables; ver `e2e/README.md` y
`e2e/registro-empresa.spec.ts`. No hay cambios Flutter para este alta web.

Los cambios se entregan en local, sin commit, push ni despliegue de este bloque.

La compilación final de producción terminó correctamente. Solo permanecen los avisos existentes de dependencias CommonJS de leaflet y qrcode.
