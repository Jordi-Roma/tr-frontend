# Plan de rediseño UI: formularios limpios, sidebar colapsable y scroll independiente

## Objetivo

Mejorar la experiencia visual del panel web de StyleAR sin cambiar la lógica del backend ni romper las funcionalidades existentes.

El problema actual es que varias pantallas muestran demasiados formularios al mismo tiempo. Esto hace que el sistema se vea cargado, más administrativo que moderno, y menos cómodo de usar.

Este plan debe aplicarse solo en el frontend Angular, respetando la estructura actual de carpetas, rutas, servicios y componentes.

---

## Alcance general

Aplicar tres mejoras principales:

1. Ocultar formularios por defecto y abrirlos mediante botones.
2. Convertir el sidebar en un menú vertical por módulos colapsables.
3. Separar el scroll del sidebar y el scroll del contenido principal.

No modificar endpoints del backend.

No cambiar nombres de rutas existentes.

No eliminar funcionalidades ya implementadas.

No romper permisos por rol.

---

## 1. Formularios ocultos por defecto

### Problema actual

En pantallas como temporadas, roles, perfil y otras, los formularios aparecen visibles todo el tiempo.

Ejemplos:

- En temporadas, el formulario “Nueva temporada” aparece al lado de la tabla.
- En roles, aparecen varios formularios visibles al mismo tiempo.
- En perfil, aparecen formularios de datos personales, contraseña y direcciones simultáneamente.

Esto sobrecarga la pantalla.

### Cambio requerido

Los formularios de creación o edición deben ocultarse por defecto.

Cada pantalla debe mostrar primero:

- encabezado de la pantalla;
- tabla/listado principal;
- filtros o buscador;
- botón principal de acción.

Ejemplo:

```txt
 Nueva temporada
 Nueva categoría
 Nuevo producto
 Nuevo usuario
 Nuevo rol
 Nuevo movimiento
 Nueva transferencia
 Registrar venta presencial
```

Al presionar el botón, recién debe aparecer el formulario.

### Comportamiento esperado

Para formularios pequeños:

- usar modal centrado;
- fondo oscurecido suave;
- botón cerrar;
- botón cancelar;
- botón guardar.

Formularios pequeños:

- categorías;
- tallas;
- colores;
- marcas;
- temporadas;
- colecciones;
- ciudades;
- permisos;
- roles simples.

Para formularios medianos o grandes:

- usar panel lateral derecho;
- ancho aproximado entre 420px y 620px;
- debe tener scroll interno si el formulario es largo;
- no debe empujar el contenido principal.

Formularios grandes:

- productos;
- variantes;
- usuarios;
- empleados;
- proveedores;
- sucursales;
- movimientos de inventario;
- transferencias de stock;
- venta presencial;
- perfil;
- direcciones.

### Perfil

En la pantalla de perfil no deben verse todos los formularios al mismo tiempo.

Debe quedar más limpio, por ejemplo:

```txt
 Perfil

[ Datos personales ]
 Botón: Editar perfil

[ Seguridad ]
 Botón: Cambiar contraseña

[ Direcciones ]
 Botón: Nueva dirección
```

Al hacer click en cada botón se abre solo ese formulario.

### Edición

Cuando el usuario presione “Editar” en una fila:

- abrir el mismo modal o panel lateral;
- precargar los datos existentes;
- cambiar el título del formulario.

Ejemplo:

```txt
 Nueva temporada
 Editar temporada
```

### Cancelar / cerrar

Todo modal o panel debe permitir cerrar con:

- botón “Cancelar”;
- botón “X”;
- después de guardar correctamente.

Al cerrar:

- limpiar formulario si era creación;
- mantener la tabla/listado actualizado;
- no dejar estados raros activos.

---

## 2. Sidebar por módulos colapsables

### Problema actual

El sidebar muestra muchas opciones al mismo tiempo.

Cuando hay muchas opciones abiertas, la barra se vuelve larga y pesada visualmente.

### Cambio requerido

El sidebar debe dividirse por módulos colapsables.

Cada módulo debe funcionar como acordeón.

Al hacer click en el nombre del módulo:

- si está cerrado, se abre;
- si está abierto, se cierra.

### Estructura deseada

```txt
 PANEL
   Dashboard
   Perfil

 SEGURIDAD
   Usuarios
   Roles y permisos
   Bitácora

 ADMINISTRACIÓN
   Productos
   Categorías
   Tallas
   Colores
   Marcas
   Temporadas
   Colecciones
   Proveedores
   Ciudades
   Sucursales
   Empleados
   Variantes
   Reservas

 VENTAS E INVENTARIO
   Inventario
   Movimientos
   Transferencias
   Venta presencial
```

### Reglas de visualización

Mantener las reglas de permisos existentes.

Ejemplos:

- Administrador ve todos los módulos permitidos.
- Encargado de sucursal ve las opciones que ya tiene autorizadas.
- Cajero ve solo las opciones que le corresponden.
- Cliente no debe ver panel administrativo.

### Estado inicial recomendado

Al entrar al panel:

- el módulo de la ruta activa debe estar abierto automáticamente;
- los otros módulos pueden estar cerrados;
- si el usuario abre otro módulo, no es obligatorio cerrar los demás, pero sería mejor mantener comportamiento tipo acordeón.

Recomendación:

- permitir varios módulos abiertos si eso es más simple;
- pero cada módulo debe poder cerrarse manualmente.

### Indicador visual

Cada módulo debe mostrar un icono de apertura/cierre:

```txt
 Administración  ▼
 Administración  ▶
```

También puede usarse `pi pi-chevron-down` y `pi pi-chevron-right`.

---

## 3. Scroll independiente

### Problema actual

Cuando el sidebar tiene muchas opciones, el scroll afecta la pantalla completa.

La navegación lateral y el contenido principal deberían moverse de forma independiente.

### Cambio requerido

El layout administrativo debe ocupar toda la pantalla y separar el scroll.

### Comportamiento esperado

Si el cursor está sobre el sidebar:

- el scroll debe mover solo el sidebar.

Si el cursor está sobre el contenido principal:

- el scroll debe mover solo la pantalla principal.

El sidebar no debe empujar ni arrastrar el contenido.

El contenido no debe arrastrar el sidebar.

### CSS esperado

Aplicar una estructura similar:

```css
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-sidebar {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.admin-main {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}
```

Si el layout actual usa otros nombres de clases, adaptar la idea sin romper el diseño existente.

---

## 4. Componentes reutilizables recomendados

Para no repetir código en todas las pantallas, crear componentes reutilizables si conviene.

### Modal genérico

Ubicación sugerida:

```txt
src/app/shared/components/app-modal/
```

Archivos:

```txt
app-modal.component.ts
app-modal.component.html
app-modal.component.css
```

Debe recibir:

- título;
- estado abierto/cerrado;
- evento cerrar;
- contenido proyectado con `ng-content`.

Uso esperado:

```html
<app-modal
  [open]="modalAbierto()"
  title="Nueva temporada"
  (close)="cerrarModal()"
>
  <!-- formulario -->
</app-modal>
```

### Panel lateral genérico

Ubicación sugerida:

```txt
src/app/shared/components/app-drawer/
```

Debe recibir:

- título;
- estado abierto/cerrado;
- evento cerrar;
- contenido proyectado con `ng-content`.

Uso esperado:

```html
<app-drawer
  [open]="drawerAbierto()"
  title="Nuevo producto"
  (close)="cerrarDrawer()"
>
  <!-- formulario -->
</app-drawer>
```

Si el proyecto no tiene carpeta `shared`, crearla respetando la estructura Angular.

---

## 5. Pantallas a ajustar

Aplicar primero a las pantallas más cargadas.

### Prioridad 1

- Temporadas
- Roles y permisos
- Perfil
- Productos
- Usuarios

### Prioridad 2

- Categorías
- Tallas
- Colores
- Marcas
- Colecciones
- Proveedores
- Ciudades
- Sucursales
- Empleados
- Variantes

### Prioridad 3

- Inventario
- Movimientos
- Transferencias
- Venta presencial
- Reservas admin
- Bitácora si corresponde

---

## 6. Criterios por pantalla

Cada pantalla debe quedar con esta estructura visual:

```txt
Encabezado
Título de pantalla
Descripción corta

Botón principal de acción

Filtros / búsqueda

Tabla o listado principal

Modal o drawer oculto por defecto
```

Ejemplo para temporadas:

```txt
Gestión de temporadas
Administra temporadas para clasificar colecciones.

[ + Nueva temporada ]

Buscar temporada
Estado

Tabla de temporadas
```

El formulario “Nueva temporada” no debe verse hasta presionar el botón.

---

## 7. Detalles de diseño

Mantener el estilo actual de StyleAR:

- fondo claro;
- sidebar oscuro;
- botones redondeados;
- color verde oliva como acento;
- tipografía fuerte para títulos;
- tarjetas limpias con sombra suave.

Evitar:

- formularios largos visibles todo el tiempo;
- columnas innecesarias;
- demasiadas tarjetas en una sola pantalla;
- scroll global que mueva todo junto.

---

## 8. Reglas técnicas

No cambiar servicios existentes salvo que sea estrictamente necesario.

No cambiar endpoints.

No cambiar modelos del backend.

No cambiar guards ni permisos de rutas, salvo que sea necesario para mantener el comportamiento actual.

No eliminar validaciones existentes.

No eliminar funcionalidades.

No duplicar formularios si se puede reutilizar el mismo para crear/editar.

Mantener `npm run build` funcionando.

---

## 9. Validaciones obligatorias

Después de aplicar los cambios, ejecutar:

```powershell
cd C:\Users\jordi\OneDrive\Documentos\TiendaRopa\frontend-tr
npx tsc --noEmit
npm run build
```

Si `npm run build` muestra warning de tamaño de bundle, no tratarlo como error mientras compile correctamente.

---

## 10. Resultado esperado

Al terminar, el panel debe sentirse:

- menos cargado;
- más moderno;
- más ordenado;
- más parecido a un sistema profesional;
- más fácil de navegar;
- con sidebar limpio y controlado;
- con formularios disponibles solo cuando el usuario los necesita.

El objetivo no es cambiar la lógica del sistema, sino mejorar la presentación y la experiencia de uso.

