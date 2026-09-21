# Plan de rediseño CRUD administrativo - StyleAR

## Objetivo

Unificar el diseño de todos los CRUD administrativos para que el panel de StyleAR se vea profesional, consistente y fácil de usar.

El administrador debe sentir que está usando un panel interno moderno, no una colección de formularios sueltos.

## Alcance

Pantallas incluidas:

```text
Productos
Variantes
Categorias
Tallas
Colores
Marcas
Temporadas
Colecciones
Proveedores
Ciudades
Sucursales
Empleados
Usuarios
Roles y permisos
Bitacora
```

## Patrón visual base

Cada CRUD debe seguir esta estructura:

```text
Encabezado de página
Toolbar de búsqueda y filtros
Tabla principal
Botón Nuevo
Modal o panel para crear/editar
Confirmación para acciones sensibles
Estados visuales: cargando, vacío, error, éxito
```

## Encabezado

Formato recomendado:

```text
[Icono] Gestión de productos
Administra productos, variantes y datos comerciales de StyleAR.
```

Debe incluir:

```text
Icono PrimeIcons relacionado al módulo
Título claro
Descripción corta
Sin etiquetas CUxx
Sin textos académicos visibles
```

Iconos sugeridos:

```text
Productos -> pi pi-shopping-bag
Variantes -> pi pi-sitemap
Categorias -> pi pi-tags
Tallas -> pi pi-sliders-h
Colores -> pi pi-palette
Marcas -> pi pi-bookmark
Temporadas -> pi pi-calendar
Colecciones -> pi pi-th-large
Proveedores -> pi pi-truck
Ciudades -> pi pi-map-marker
Sucursales -> pi pi-building
Empleados -> pi pi-id-card
Usuarios -> pi pi-users
Roles y permisos -> pi pi-shield
Bitacora -> pi pi-history
```

## Toolbar

Cada pantalla debe tener una barra de herramientas antes de la tabla.

Elementos recomendados:

```text
Input de búsqueda
Filtro de estado
Filtros específicos del módulo
Botón Nuevo
```

Ejemplo:

```text
[Buscar producto...] [Estado: Todos] [Categoría: Todas]        [+ Nuevo producto]
```

Reglas:

```text
La búsqueda debe filtrar en tiempo real cuando sea posible.
El botón Nuevo debe estar siempre visible.
Los filtros deben ser simples y no ocupar demasiado espacio.
En móvil, la toolbar debe apilarse verticalmente.
```

## Tabla

Todas las tablas deben verse consistentes.

Columnas comunes:

```text
Nombre / descripción principal
Datos secundarios
Estado
Fecha o referencia
Acciones
```

Reglas visuales:

```text
Cabecera de tabla en mayúsculas pequeñas.
Filas con hover suave.
Estado con badge.
Acciones con iconos.
No usar botones grandes dentro de cada fila.
```

Acciones estándar:

```text
Ver -> pi pi-eye
Editar -> pi pi-pencil
Activar -> pi pi-check-circle
Desactivar -> pi pi-ban
Eliminar -> pi pi-trash
Guardar -> pi pi-check
Cancelar -> pi pi-times
```

## Estados

Todos los CRUD deben manejar:

```text
Cargando
Sin datos
Sin resultados por filtros
Error de backend
Guardado correcto
Actualización correcta
Desactivación correcta
```

Formato recomendado:

```text
[Icono]
No hay productos registrados
Crea el primer producto para comenzar a vender.
[+ Nuevo producto]
```

## Formularios

Para CRUD simples usar modal pequeño:

```text
Categorias
Tallas
Colores
Marcas
Temporadas
Ciudades
```

Para CRUD medianos usar modal amplio:

```text
Colecciones
Sucursales
Proveedores
Roles
```

Para CRUD complejos usar panel amplio o pantalla dividida:

```text
Productos
Variantes
Usuarios
Empleados
```

## Modal de creación/edición

Estructura:

```text
Título del modal
Descripción breve
Formulario
Acciones: Cancelar / Guardar
```

Ejemplo:

```text
Nuevo producto
Completa los datos base del producto.

Nombre
Categoría
Marca
Material
Género
Descripción

[Cancelar] [Guardar producto]
```

Reglas:

```text
No abrir formularios gigantes si el CRUD es simple.
Los campos obligatorios deben estar marcados.
Los errores deben mostrarse debajo del campo.
Los botones deben estar al final.
El modal debe poder cerrarse con Cancelar.
```

## Badges de estado

Usar badges consistentes:

```text
Activo -> verde
Inactivo -> gris o rojo suave
Bajo stock -> alerta suave
Nuevo -> verde oliva suave
Sin precio -> gris
```

Ejemplo visual:

```text
[Activo]
[Inactivo]
[Bajo stock]
[Sin precio]
```

## Diseño por tipo de CRUD

### CRUD simple

Aplica a:

```text
Categorias
Tallas
Colores
Marcas
Temporadas
Ciudades
```

Diseño:

```text
Header
Toolbar
Tabla
Modal pequeño
```

Campos comunes:

```text
Nombre
Descripción
Estado
```

### CRUD medio

Aplica a:

```text
Colecciones
Sucursales
Proveedores
Roles y permisos
```

Diseño:

```text
Header
Toolbar con filtros
Tabla
Modal amplio
```

Debe permitir:

```text
Relaciones con otras entidades
Filtros adicionales
Badges o etiquetas
```

### CRUD complejo

Aplica a:

```text
Productos
Variantes
Usuarios
Empleados
```

Diseño:

```text
Header
Toolbar avanzada
Tabla grande
Panel lateral o modal amplio
Secciones dentro del formulario
```

Producto debe separar:

```text
Datos base
Clasificación
Proveedores
Colecciones
Estado
```

Variantes debe separar:

```text
Producto
Talla
Color
SKU
Precios
Estado
```

Usuarios debe separar:

```text
Datos personales
Cuenta
Roles
Estado de acceso
```

## Orden recomendado de implementación

### Fase 1 - Base compartida

Crear estilos reutilizables:

```text
admin-page
admin-header
admin-toolbar
admin-table
admin-badge
admin-actions
admin-modal
empty-state
loading-state
```

### Fase 2 - CRUD simples

Rediseñar primero:

```text
Categorias
Tallas
Colores
Marcas
Temporadas
Ciudades
```

Motivo:

```text
Son pantallas más pequeñas y sirven para validar el patrón visual.
```

### Fase 3 - CRUD medios

Rediseñar:

```text
Colecciones
Sucursales
Proveedores
Roles y permisos
```

### Fase 4 - CRUD complejos

Rediseñar:

```text
Productos
Variantes
Usuarios
Empleados
```

### Fase 5 - Bitácora

Rediseñar como pantalla de consulta:

```text
Filtros por usuario
Filtros por operación
Filtros por fecha
Tabla de eventos
Detalle de evento
```

## Criterios de aceptación

Cada CRUD se considera terminado cuando:

```text
Compila sin errores.
No muestra etiquetas CUxx.
No tiene textos con caracteres rotos.
Tiene encabezado con icono.
Tiene búsqueda o filtros.
Tiene tabla consistente.
Tiene estados de cargando, vacío y error.
Tiene acciones con iconos.
Tiene formulario ordenado.
Funciona en desktop y móvil.
```

## Checklist final

Antes de cerrar el rediseño de CRUD:

```text
npm run build
Probar crear
Probar editar
Probar activar/desactivar
Probar filtros
Probar búsqueda
Probar responsive
Revisar que cliente no vea módulos admin
```

## Nota importante

No rediseñar todos los CRUD a la vez sin verificar. Conviene avanzar por fases para evitar romper formularios que ya funcionan.
