# PLAN FINAL - Rediseño pendiente frontend StyleAR

## Objetivo

Completar el rediseño visual y funcional del frontend de StyleAR para que se vea como una tienda de ropa moderna, manteniendo:

- Tienda pública con navegación horizontal tipo ecommerce.
- Panel administrativo con sidebar vertical por módulos.
- CRUD administrativos con diseño uniforme, profesional y fácil de usar.
- Buena comunicación visual entre frontend y backend.
- Sin textos técnicos visibles como `CU01`, `CU10`, etc.

---

## 1. Validación inicial antes de modificar

Antes de tocar más código:

1. Revisar que el proyecto compile.
2. Si aparece `spawn EPERM`, cerrar cualquier `ng serve` abierto y volver a probar.
3. No modificar dependencias salvo que sea necesario.
4. Confirmar que las librerías instaladas estén disponibles:
   - PrimeNG
   - PrimeIcons
   - PrimeFlex
   - SweetAlert2
   - Chart.js

Comandos sugeridos:

```powershell
cd C:\Users\jordi\OneDrive\Documentos\TiendaRopa\frontend-tr
npm run build
```

---

## 2. Corregir y terminar el diseño general

### 2.1 Layout público ecommerce

Mantener el enfoque:

```txt
Inicio | Catálogo | Poleras | Oversize | Camisas | Buscar | Favoritos | Carrito | Usuario
```

Pendiente:

- Revisar que el navbar público se vea bien en escritorio.
- Hacer responsive para celular.
- Mejorar el menú móvil si actualmente se rompe.
- Revisar que el carrito muestre cantidad cuando haya productos agregados.
- Revisar que Favoritos tenga contador o estado visual si aplica.

### 2.2 Layout administrativo

Mantener sidebar vertical por módulos:

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
Sucursales
Empleados
```

Pendiente:

- Verificar iconos al lado de todos los nombres.
- Ajustar espaciado del sidebar.
- Marcar correctamente la opción activa.
- Revisar que no aparezcan módulos administrativos para usuarios cliente.
- Si el usuario no es administrador, ocultar módulos internos.

---

## 3. Terminar rediseño de CRUD simples

Los CRUD simples ya tienen una base visual. Revisar y completar:

- Categorías
- Tallas
- Colores
- Marcas
- Temporadas
- Ciudades

Para cada uno:

- Mantener encabezado con icono.
- Mantener formulario en panel.
- Mantener tabla limpia.
- Mantener botones con iconos:
  - Guardar
  - Editar
  - Cancelar
  - Eliminar
- Agregar estado vacío cuando no haya registros.
- Agregar loading visual si la pantalla espera respuesta del backend.
- Reemplazar `alert()` por SweetAlert2 si existe alguno.
- Revisar errores del backend y mostrarlos de forma elegante.

---

## 4. Rediseñar CRUD complejos

Estos son los más importantes y deben quedar mejor trabajados:

- Productos
- Proveedores
- Sucursales
- Empleados
- Usuarios
- Roles y permisos
- Colecciones

### 4.1 Patrón visual obligatorio

Cada pantalla debe tener:

```txt
Encabezado
Icono + título + descripción corta

Panel de acciones
Buscar + botón Nuevo + filtros si aplica

Tabla principal
Columnas claras + estado + acciones

Formulario
Preferible modal o panel lateral
```

### 4.2 Botones

Usar estilo consistente:

- Botón principal: fondo oscuro o verde oliva.
- Botón secundario: borde suave.
- Botón peligro: rojo suave.

Iconos sugeridos:

```txt
Nuevo: pi pi-plus
Editar: pi pi-pencil
Eliminar: pi pi-trash
Guardar: pi pi-check
Cancelar: pi pi-times
Buscar: pi pi-search
Actualizar: pi pi-refresh
Ver detalle: pi pi-eye
```

---

## 5. Productos: prioridad máxima

La pantalla de productos debe sentirse como inventario de tienda de ropa.

### 5.1 Mejorar tabla de productos

Columnas recomendadas:

```txt
Producto
Categoría
Marca
Precio
Stock
Estado
Acciones
```

No usar imagen obligatoria por ahora. En lugar de imagen:

- Mostrar un bloque/placeholder con inicial del producto.
- O usar icono `pi pi-shopping-bag`.

### 5.2 Formulario de producto

Campos mínimos:

- Nombre
- Descripción
- Categoría
- Marca
- Temporada
- Colección
- Precio
- Estado activo/inactivo

Si ya existen variantes, separar:

```txt
Datos generales del producto
Variantes por talla/color
Stock
```

### 5.3 Variantes

Para ropa, las variantes son clave:

```txt
Producto: Polera Oversize Negra
Talla: S, M, L, XL
Color: Negro
Stock por variante
```

Pendiente:

- Revisar si el frontend ya consume variantes.
- Si existen endpoints, mejorar interfaz.
- Si no existen, dejar preparada la sección visual pero sin romper funcionalidad.

---

## 6. Usuarios y roles

### 6.1 Usuarios

Pendiente:

- Mejorar tabla de usuarios.
- Crear usuario desde administración si el backend lo permite.
- Si el backend responde `405`, dejar mensaje claro y no formulario roto.
- Mostrar rol del usuario.
- Mostrar estado activo/inactivo.
- Evitar que un cliente vea opciones administrativas.

### 6.2 Roles y permisos

Pendiente:

- Mejorar visualmente la gestión de roles.
- Mostrar permisos agrupados por módulo.
- Evitar listas largas sin orden.
- Usar cards o secciones:

```txt
Acceso
Usuarios
Catálogo
Ventas
Inventario
Reportes
```

---

## 7. Perfil de usuario

El perfil está reportado como “todo raro”.

Pendiente:

- Rediseñar pantalla de perfil.
- Separar en cards:

```txt
Datos personales
Cuenta
Seguridad
Preferencias
```

- Mejorar inputs.
- Agregar avatar simple con iniciales.
- Botón guardar claro.
- Mensajes de éxito/error elegantes.

---

## 8. Dashboard administrativo

Si existe dashboard, mejorarlo con cards.

Cards recomendadas:

```txt
Productos activos
Stock bajo
Usuarios registrados
Pedidos recientes
Ventas del mes
```

Si todavía no hay endpoints reales:

- Usar datos calculados de endpoints existentes.
- Si no se puede, dejar placeholders sobrios.
- No inventar datos falsos exagerados.

---

## 9. Estados visuales generales

Aplicar a todas las pantallas:

### 9.1 Loading

Cuando se esté cargando información:

```txt
Cargando registros...
```

O spinner de PrimeNG si ya está disponible.

### 9.2 Empty state

Cuando no haya registros:

```txt
No hay registros todavía.
Crea el primero para comenzar.
```

### 9.3 Error state

Cuando falle el backend:

```txt
No se pudo cargar la información.
Verifica la conexión con el servidor.
```

---

## 10. SweetAlert2

Reemplazar alertas básicas por SweetAlert2.

Usar para:

- Confirmar eliminación.
- Mostrar creación exitosa.
- Mostrar actualización exitosa.
- Mostrar error del servidor.

Ejemplo visual esperado:

```txt
¿Eliminar registro?
Esta acción no se puede deshacer.

Cancelar | Sí, eliminar
```

---

## 11. Catálogo público

Completar la experiencia ecommerce.

Pendiente:

- Revisar catálogo.
- Agregar filtros:
  - Categoría
  - Talla
  - Color
  - Precio
- Cards sin imágenes por ahora, usando placeholder elegante.
- Botón agregar al carrito.
- Botón favoritos.
- Estado vacío si no hay productos.
- Detalle de producto limpio.

---

## 12. Carrito

Pendiente:

- Mejorar vista del carrito.
- Mostrar productos agregados.
- Permitir cambiar cantidad.
- Permitir quitar producto.
- Mostrar subtotal.
- Mostrar total.
- Botón continuar compra.

Si no hay flujo de pago todavía:

- Dejar botón como “Continuar compra” o “Finalizar pedido”.
- No integrar pasarela de pago todavía si el backend no está listo.

---

## 13. Login y registro

Ya fueron rediseñados, pero revisar:

- Responsive.
- Mensajes de error.
- Campos alineados.
- Que login redirija según rol:
  - Cliente a tienda.
  - Administrador a panel.
- Que registro cree usuario cliente.

---

## 14. Comunicación frontend/backend

Revisar en `api.config.ts`:

```ts
export const API_BASE_URL = 'https://backend-tr-production.up.railway.app';
```

Pendiente:

- Confirmar que no quede `127.0.0.1:8000` para producción.
- Confirmar CORS del backend con dominio frontend.
- Probar login.
- Probar carga de productos.
- Probar CRUD básico.

---

## 15. Limpieza visual

Buscar y eliminar de pantallas visibles:

- `CU01`
- `CU02`
- `CU03`
- `CU10`
- Textos técnicos de casos de uso.
- Mojibake:
  - `GestiÃ³n`
  - `DescripciÃ³n`
  - `CategorÃ­a`
  - `ContraseÃ±a`

Comando sugerido:

```powershell
rg "CU[0-9]|Ã|Â|â" src/app -g "*.html" -g "*.ts" -g "*.css"
```

---

## 16. Responsive

Revisar en:

- Escritorio
- Tablet
- Celular

Pendiente:

- Navbar público no debe romperse.
- Sidebar admin debe adaptarse.
- Tablas deben permitir scroll horizontal.
- Formularios deben verse en una sola columna en móvil.

---

## 17. Pruebas manuales finales

Probar como administrador:

- Login admin.
- Dashboard.
- Usuarios.
- Roles.
- Bitácora.
- Productos.
- Categorías.
- Tallas.
- Colores.
- Marcas.
- Temporadas.
- Colecciones.
- Proveedores.
- Sucursales.
- Empleados.
- Perfil.

Probar como cliente:

- Registro.
- Login.
- Inicio.
- Catálogo.
- Detalle producto.
- Favoritos.
- Carrito.
- Perfil.
- Cerrar sesión.

---

## 18. Build final

Cuando todo esté listo:

```powershell
npm run build
```

Si pasa correctamente, hacer commit.

---

## 19. Commit sugerido

```powershell
git status
git add .
git commit -m "Completar rediseño ecommerce y panel administrativo"
git push origin main
```

---

## Criterios de terminado

El trabajo se considera terminado cuando:

- El frontend compila.
- No aparecen textos `CUxx`.
- El panel admin tiene iconos y estilo consistente.
- Los CRUD principales tienen diseño uniforme.
- Productos se ve como módulo de tienda de ropa.
- El perfil ya no se ve desordenado.
- El cliente no ve opciones administrativas.
- El catálogo, carrito y favoritos se ven como ecommerce.
- La URL de producción usa el backend de Railway.

