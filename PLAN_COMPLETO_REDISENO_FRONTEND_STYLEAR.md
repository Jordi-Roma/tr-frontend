# Plan completo de rediseno frontend - StyleAR

## 1. Objetivo

Redisenar el frontend Angular de StyleAR para que deje de sentirse como un sistema generico y se vea como una tienda de ropa juvenil, manteniendo al mismo tiempo un panel administrativo ordenado por modulos.

El sistema debe tener dos experiencias visuales:

```text
Cliente: ecommerce limpio, horizontal, simple y orientado a compra.
Administrador: panel interno con sidebar, tablas, formularios y modales.
```

## 2. Decisiones actuales

```text
Paleta elegida: Opcion 2 - Streetwear Minimalista.
Imagenes de productos: no usar por ahora.
Cliente visitante: no implementar por ahora.
Flujo actual: login / registro primero, luego acceso a tienda.
Iconos: usar PrimeIcons en navbar, sidebar, botones y acciones.
Etiquetas CUxx: no deben mostrarse en la interfaz final.
```

## 3. Stack visual

Librerias instaladas:

```text
PrimeNG
PrimeIcons
PrimeFlex
Chart.js
SweetAlert2
```

Uso recomendado:

```text
PrimeNG: tablas, dialogos, inputs, dropdowns, tags, badges, botones y toast.
PrimeIcons: iconos de navegacion y acciones.
PrimeFlex: layout responsive, grillas y espaciado.
Chart.js: dashboard y reportes.
SweetAlert2: confirmaciones importantes.
```

## 4. Paleta oficial

```css
:root {
  --color-bg: #F5F5F2;
  --color-surface: #FFFFFF;
  --color-text: #151515;
  --color-muted: #717171;

  --color-primary: #111111;
  --color-primary-hover: #2A2A2A;

  --color-accent: #7C8F5A;
  --color-accent-soft: #DDE5CF;

  --color-border: #E1E1DC;
  --color-danger: #D94A38;
  --color-success: #3D8B5B;
}
```

## 5. Reglas visuales

```text
Usar fondo gris claro.
Usar superficies blancas.
Usar texto negro o gris oscuro.
Usar verde oliva como acento.
Usar botones principales negros.
Usar radio moderado, no demasiado redondo.
Evitar gradientes fuertes.
Evitar colores azules corporativos.
No mostrar codigos CUxx al usuario.
No depender de imagenes de productos por ahora.
No mostrar modulos administrativos a clientes.
```

## 6. Navegacion por rol

### Cliente

Usar navbar horizontal tipo ecommerce.

Menu recomendado:

```text
Inicio
Catalogo
Poleras
Oversize
Camisas
Favoritos
Carrito
Perfil
Salir
```

Iconos recomendados:

```text
Inicio -> pi pi-home
Catalogo -> pi pi-shopping-bag
Poleras -> pi pi-tag
Oversize -> pi pi-sparkles
Camisas -> pi pi-bookmark
Favoritos -> pi pi-heart
Carrito -> pi pi-shopping-cart
Perfil -> pi pi-user
Salir -> pi pi-sign-out
```

### Administrador

Usar sidebar vertical por modulos.

Menu recomendado:

```text
PANEL
Dashboard
Perfil

SEGURIDAD
Usuarios
Roles y permisos
Bitacora

ADMINISTRACION
Productos
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
Variantes
```

Iconos recomendados:

```text
Dashboard -> pi pi-chart-line
Perfil -> pi pi-user
Usuarios -> pi pi-users
Roles y permisos -> pi pi-shield
Bitacora -> pi pi-history
Productos -> pi pi-shopping-bag
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
Variantes -> pi pi-sitemap
```

## 7. Sin imagenes por ahora

Como se eligio trabajar sin imagenes de productos, las cards deben sostenerse con informacion visual no fotografica.

Cada card debe mostrar:

```text
Nombre del producto
Categoria
Descripcion corta
Precio
Stock
Tallas disponibles
Colores disponibles
Estado: Nuevo, Activo, Bajo stock, Oferta
Boton Agregar al carrito
Boton Favorito
```

Recursos visuales permitidos:

```text
Bloque de color
Iniciales de categoria
Chips de talla
Swatches de color
Badges de estado
Iconos PrimeIcons
Bordes y sombras sutiles
```

No usar:

```text
Fotos externas sin derechos
Imagenes generadas como recurso final
Placeholders con modelos reales
Cards vacias sin elemento visual
```

## 8. Componentes base

Crear o estandarizar estos estilos/componentes:

```text
Boton primario
Boton secundario
Boton icono
Input
Select
Textarea
Card
Badge
Tag de estado
Tabla admin
Modal admin
Estado vacio
Estado cargando
Estado error
Toast / alerta
```

## 9. Pantallas prioritarias

### Fase 1 - Base visual global

Objetivo: que toda la app use la misma identidad visual.

Tareas:

```text
Definir variables CSS globales.
Importar PrimeIcons y PrimeFlex.
Normalizar fuentes, fondo, inputs y botones.
Revisar responsive base.
Subir budget de Angular si el warning molesta.
```

Criterio de aceptacion:

```text
La app compila.
No hay errores visuales globales.
No hay codigos CUxx visibles.
```

### Fase 2 - Auth

Pantallas:

```text
Login
Registro
```

Tareas:

```text
Redisenar login centrado.
Redisenar registro.
Corregir textos con caracteres rotos.
Mantener validaciones.
Mantener redireccion despues de login.
```

Criterio de aceptacion:

```text
El usuario puede iniciar sesion.
El usuario puede registrarse.
Los errores se muestran claros.
La UI se ve como tienda de ropa.
```

### Fase 3 - Layout cliente/admin

Tareas:

```text
Cliente con navbar horizontal.
Administrador con sidebar vertical.
Agregar iconos al lado de cada opcion.
Ocultar opciones admin para cliente.
Mantener boton de cerrar sesion.
```

Criterio de aceptacion:

```text
Cliente no ve modulos admin.
Admin ve sidebar completo.
La navegacion tiene iconos y estado activo.
```

### Fase 4 - Home ecommerce

Tareas:

```text
Hero textual sin imagen.
CTA hacia catalogo.
Categorias rapidas.
Cards destacadas sin imagen.
Beneficios de compra.
```

Criterio de aceptacion:

```text
La pantalla de inicio parece ecommerce.
No parece un dashboard tecnico.
No depende de fotos.
```

### Fase 5 - Catalogo real

Tareas:

```text
Crear pagina Catalogo real.
Conectar productos desde backend.
Filtrar por categoria, talla, color y precio.
Ordenar por precio, nombre o relevancia.
Mostrar cards sin imagen.
Agregar boton favoritos.
Agregar boton carrito.
```

Criterio de aceptacion:

```text
Los productos vienen del backend.
Los filtros funcionan.
La grilla se ve bien en desktop y movil.
```

### Fase 6 - Detalle de producto

Tareas:

```text
Crear ruta de detalle.
Mostrar nombre, descripcion, precio, stock y variantes.
Seleccionar talla.
Seleccionar color.
Seleccionar cantidad.
Agregar al carrito.
Mostrar productos relacionados.
```

Criterio de aceptacion:

```text
El usuario entiende que esta comprando.
El flujo no necesita imagenes para funcionar.
```

### Fase 7 - Carrito

Tareas:

```text
Crear pagina Carrito.
Listar productos agregados.
Modificar cantidad.
Eliminar producto.
Calcular subtotal y total.
Preparar confirmacion de pedido.
```

Criterio de aceptacion:

```text
El carrito se entiende visualmente.
El total se actualiza correctamente.
```

### Fase 8 - Perfil

Tareas:

```text
Redisenar perfil.
Separar datos personales, seguridad y direcciones.
Corregir layout raro.
Usar cards limpias.
Mostrar estados de guardado.
```

Criterio de aceptacion:

```text
El perfil deja de verse desordenado.
Los formularios son faciles de completar.
```

### Fase 9 - Admin productos

Tareas:

```text
Redisenar tabla de productos.
Usar badges de estado.
Usar modal para crear/editar si conviene.
Mantener formulario actual si aun es mas seguro.
No mostrar seccion de imagenes por ahora.
Mejorar busqueda y filtros.
```

Criterio de aceptacion:

```text
El admin puede crear, editar, activar y desactivar productos.
La pantalla se ve como panel profesional.
```

### Fase 10 - Admin modulos secundarios

Pantallas:

```text
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
Roles
Bitacora
```

Tareas:

```text
Quitar etiquetas CUxx.
Corregir caracteres rotos.
Estandarizar encabezados.
Estandarizar tablas.
Estandarizar formularios.
Agregar iconos de accion.
Agregar estados vacios.
```

Criterio de aceptacion:

```text
Todas las pantallas comparten el mismo estilo.
No quedan textos academicos visibles tipo CUxx.
```

### Fase 11 - Dashboard y reportes

Tareas:

```text
Crear dashboard admin real.
Mostrar tarjetas de resumen.
Agregar graficos con Chart.js.
Mostrar ventas, pedidos, productos y usuarios.
```

Criterio de aceptacion:

```text
El dashboard resume el estado de la tienda.
No es solo una pantalla de bienvenida.
```

### Fase 12 - Responsive y accesibilidad

Tareas:

```text
Revisar desktop.
Revisar tablet.
Revisar movil.
Verificar contraste.
Verificar foco visible.
Verificar labels en formularios.
Evitar textos cortados.
```

Criterio de aceptacion:

```text
La app se puede usar en pantalla chica.
Los formularios siguen siendo legibles.
Los menus no se rompen.
```

## 10. Integracion con backend

Endpoints que deben revisarse para tienda:

```text
Productos
Categorias
Tallas
Colores
Marcas
Variantes
Perfil
Usuarios
Pedidos
Carrito
Favoritos
```

Si el backend aun no tiene carrito, favoritos o pedidos, se puede trabajar primero con estado local en frontend y luego conectarlo.

## 11. Checklist de limpieza visual

Antes de dar por terminada cada pantalla:

```text
No hay etiquetas CUxx.
No hay textos con caracteres rotos.
No hay botones sin icono cuando aplica.
No hay cards vacias.
No hay modulos admin visibles para cliente.
No hay layout roto en mobile.
No hay colores fuera de la paleta.
```

## 12. Comandos de verificacion

```powershell
npm run build
```

```powershell
npm start
```

Rutas para revisar:

```text
http://localhost:4200/login
http://localhost:4200/registro
http://localhost:4200/inicio
http://localhost:4200/catalogo
http://localhost:4200/productos
http://localhost:4200/perfil
```

## 13. Orden recomendado para continuar

```text
1. Terminar limpieza visual de sidebar y etiquetas CUxx.
2. Corregir caracteres rotos en pantallas antiguas.
3. Redisenar perfil.
4. Crear catalogo real conectado al backend.
5. Crear detalle de producto.
6. Crear carrito.
7. Redisenar productos admin.
8. Redisenar pantallas CRUD secundarias.
9. Crear dashboard con reportes.
10. Revisar responsive final.
```

## 14. Nota de alcance

Este plan prioriza el aspecto ecommerce sin imagenes. Cuando se decida agregar imagenes, se debe abrir una fase nueva para:

```text
Subida de imagen desde admin.
Almacenamiento en backend o servicio externo.
Preview de imagen.
Imagen principal del producto.
Galeria de detalle.
Fallback si no hay imagen.
```
