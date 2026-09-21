# Plan de rediseno ecommerce - StyleAR

## Decision visual

Se usara la Opcion 2: Streetwear Minimalista.

La tienda debe sentirse juvenil, limpia, urbana y enfocada en poleras basicas, prendas oversize y camisas juveniles. Por ahora no se usaran imagenes de productos; el diseno debe funcionar con informacion textual, categorias, colores, precios, tallas y stock.

## Paleta de colores

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

## Librerias a usar

Ya instaladas:

```text
PrimeNG
PrimeIcons
PrimeFlex
Chart.js
SweetAlert2
```

Uso recomendado:

```text
PrimeNG: botones, tablas, dialogs, inputs, dropdowns, tags, badges, toast y confirmaciones.
PrimeIcons: iconos de carrito, usuario, busqueda, editar, eliminar, guardar y cerrar sesion.
PrimeFlex: grillas, espaciado y responsividad.
Chart.js: dashboard y reportes.
SweetAlert2: alertas puntuales si una confirmacion necesita mas impacto visual.
```

## Navegacion

Se separa la experiencia en dos mundos:

```text
Cliente: menu horizontal tipo ecommerce.
Administrador: menu lateral vertical tipo sistema.
```

### Navegacion cliente

Como de momento se trabajara sin visitante anonimo, el usuario primero debe iniciar sesion o registrarse. Luego accede a la tienda.

Menu sugerido:

```text
Inicio | Catalogo | Poleras | Oversize | Camisas | Buscar | Favoritos | Carrito | Usuario
```

### Navegacion administrador

Menu lateral por modulos:

```text
Dashboard
Productos
Categorias
Tallas
Colores
Marcas
Temporadas
Colecciones
Proveedores
Compras
Ventas / Pedidos
Usuarios
Reportes
Configuracion
```

## Sin imagenes por ahora

El catalogo no debe depender de fotos. Las cards de producto deben mostrar:

```text
Nombre del producto
Categoria
Tipo de prenda
Precio
Stock
Tallas disponibles
Colores disponibles
Etiqueta de estado: Activo, Bajo stock, Nuevo, Oferta
Boton Agregar al carrito
Boton Favorito
```

Para que las cards no se vean vacias, se usaran recursos visuales sin imagen:

```text
Bloques de color basados en el color principal del producto.
Iniciales o icono de prenda.
Chips de talla.
Swatches de color.
Badges de estado.
Fondos suaves con borde.
```

## Pantallas prioritarias

1. Login y registro

Objetivo: que se vea moderno, centrado y limpio.

Debe incluir:

```text
Logo StyleAR
Formulario centrado
Inputs consistentes
Boton principal negro
Link para alternar entre login y registro
Mensajes de error claros
```

2. Layout principal cliente

Objetivo: convertir la app en una tienda.

Debe incluir:

```text
Navbar horizontal
Buscador
Acceso a carrito
Acceso a usuario/perfil
Responsive para pantallas pequenas
```

3. Inicio ecommerce

Objetivo: dar bienvenida y acceso rapido a secciones.

Sin imagenes, debe usar:

```text
Hero textual
CTA hacia catalogo
Resumen de categorias
Beneficios: envios, pagos, cambios, calidad
Productos destacados en cards sin imagen
```

4. Catalogo

Objetivo: mostrar productos como ecommerce.

Debe incluir:

```text
Cards de productos sin imagen
Filtros por categoria, talla, color y precio
Ordenamiento
Buscador
Boton agregar al carrito
```

5. Detalle de producto

Objetivo: mostrar informacion clara del producto.

Debe incluir:

```text
Nombre
Precio
Descripcion
Categoria
Tallas disponibles
Colores disponibles
Stock
Selector de cantidad
Agregar al carrito
```

6. Carrito

Objetivo: revisar compra antes de confirmar.

Debe incluir:

```text
Lista de productos
Cantidad
Precio unitario
Subtotal
Total
Boton continuar comprando
Boton confirmar pedido
```

7. Panel administrativo

Objetivo: mantener el enfoque por modulos.

Debe incluir:

```text
Sidebar vertical
Tablas con PrimeNG
Botones de crear, editar, eliminar
Modales para formularios
Filtros y busqueda
Badges de estado
```

## Criterios de diseno

```text
Fondo claro gris suave.
Superficies blancas.
Texto negro limpio.
Botones principales negros.
Acentos verde oliva para estados, chips y detalles.
Cards con borde fino y radio moderado.
No usar gradientes fuertes.
No usar imagenes por ahora.
No usar menu vertical para cliente.
No mostrar modulos administrativos a cliente.
```

## Orden de implementacion

1. Definir variables globales de color y estilos base.
2. Configurar estilos de PrimeNG.
3. Redisenar login y registro.
4. Redisenar layout cliente con navbar horizontal.
5. Crear home ecommerce sin imagenes.
6. Redisenar catalogo con cards sin imagen.
7. Redisenar detalle de producto.
8. Redisenar carrito.
9. Ajustar panel administrativo con sidebar y tablas.
10. Revisar responsive y consistencia visual.

## Resultado esperado

El frontend debe dejar de sentirse como un sistema generico y empezar a verse como una tienda de ropa juvenil. La administracion conserva la organizacion por modulos, pero la experiencia del cliente se presenta como ecommerce.
