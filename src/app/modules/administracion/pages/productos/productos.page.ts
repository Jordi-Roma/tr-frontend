import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ProductoResponse, ImagenProductoRequest } from '../../models/producto.models';
import { ProductoService } from '../../services/producto.service';
import { CatalogoService } from '../../services/catalogo.service';
import { ProveedorService } from '../../services/proveedor.service';
import { ColeccionService } from '../../services/coleccion.service';
import {
  CategoriaResponse,
  MarcaResponse,
  ColeccionResponse,
} from '../../models/catalogo.models';
import { ProveedorResponse } from '../../models/proveedor.models';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';

@Component({
  imports: [ReactiveFormsModule, AppDrawerComponent],
  selector: 'app-productos-page',
  styleUrl: './productos.page.css',
  templateUrl: './productos.page.html',
})
export class ProductosPage implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly coleccionService = inject(ColeccionService);

  protected readonly productos = signal<ProductoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly marcas = signal<MarcaResponse[]>([]);
  protected readonly proveedores = signal<ProveedorResponse[]>([]);
  protected readonly colecciones = signal<ColeccionResponse[]>([]);

  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly productoEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  // Se mantiene por compatibilidad con el backend, pero la UI no muestra imagenes por ahora.
  protected readonly imagenesEditando = signal<ImagenProductoRequest[]>([]);

  protected readonly productosFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.productos().filter((producto) => {
      const coincideBusqueda =
        busqueda === '' ||
        [
          producto.nombre,
          producto.descripcion ?? '',
          producto.categoria_nombre,
          producto.marca_nombre ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && producto.activo) ||
        (estado === 'inactivos' && !producto.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly productoForm = new FormGroup({
    categoria_id: new FormControl<number | null>(null, [Validators.required]),
    marca_id: new FormControl<number | null>(null),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    descripcion: new FormControl<string | null>(null),
    material: new FormControl<string | null>(null),
    genero: new FormControl<string | null>(null),
    tipo_prenda: new FormControl<string>('SUPERIOR', { nonNullable: true }),
    tipo_corte: new FormControl<string>('REGULAR_FIT', { nonNullable: true }),
    ancho_base_cm: new FormControl<number | null>(53.0),
    largo_base_cm: new FormControl<number | null>(72.0),
    colecciones_ids: new FormControl<number[]>([]),
    proveedores_ids: new FormControl<number[]>([]),
    url_imagen_nueva: new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogoService
      .listarCategorias()
      .subscribe((data) => this.categorias.set(data.filter((categoria) => categoria.activo)));

    this.catalogoService
      .listarMarcas()
      .subscribe((data) => this.marcas.set(data.filter((marca) => marca.activo)));

    this.proveedorService
      .listarProveedores()
      .subscribe((data) => this.proveedores.set(data.filter((proveedor) => proveedor.activo)));

    this.coleccionService
      .listarColecciones()
      .subscribe((data) => this.colecciones.set(data.filter((coleccion) => coleccion.activo)));

    this.cargarProductos();
  }

  private cargarProductos(): void {
    this.cargando.set(true);
    this.productoService
      .listarProductos()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (productos) => this.productos.set(productos),
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarProducto(producto: ProductoResponse): void {
    this.productoEditandoId.set(producto.id);
    this.productoForm.reset();
    this.productoForm.patchValue({
      categoria_id: producto.categoria_id,
      marca_id: producto.marca_id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      material: producto.material,
      genero: producto.genero,
      tipo_prenda: producto.tipo_prenda || 'SUPERIOR',
      tipo_corte: producto.tipo_corte || 'REGULAR_FIT',
      ancho_base_cm: producto.ancho_base_cm ?? 53.0,
      largo_base_cm: producto.largo_base_cm ?? 72.0,
      colecciones_ids: producto.colecciones_ids,
      proveedores_ids: producto.proveedores_ids,
    });
    this.imagenesEditando.set(
      producto.imagenes.map((img) => ({ url: img.url, es_principal: img.es_principal }))
    );
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected abrirNuevoProducto(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
  }

  protected cancelarEdicion(): void {
    this.productoEditandoId.set(null);
    this.productoForm.reset();
    this.imagenesEditando.set([]);
    this.formularioAbierto.set(false);
  }

  protected agregarImagen(): void {
    const urlControl = this.productoForm.get('url_imagen_nueva');
    const url = urlControl?.value?.trim();

    if (!url) {
      return;
    }

    this.imagenesEditando.update((imagenes) => [
      ...imagenes,
      { url, es_principal: imagenes.length === 0 },
    ]);
    urlControl?.setValue('');
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      if (base64Url) {
        this.imagenesEditando.update((imagenes) => [
          ...imagenes,
          { url: base64Url, es_principal: imagenes.length === 0 },
        ]);
      }
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  protected quitarImagen(index: number): void {
    this.imagenesEditando.update((imagenes) => {
      const copia = [...imagenes];
      const removida = copia.splice(index, 1)[0];

      if (removida.es_principal && copia.length > 0) {
        copia[0].es_principal = true;
      }

      return copia;
    });
  }

  protected setPrincipal(index: number): void {
    this.imagenesEditando.update((imagenes) =>
      imagenes.map((imagen, i) => ({ ...imagen, es_principal: i === index }))
    );
  }

  protected obtenerImagenPrincipal(producto: ProductoResponse): string | null {
    if (!producto.imagenes || producto.imagenes.length === 0) {
      return null;
    }
    const principal = producto.imagenes.find((img) => img.es_principal);
    return principal ? principal.url : producto.imagenes[0].url;
  }

  protected onColeccionesChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const values = Array.from(select.selectedOptions).map((option) =>
      Number.parseInt(option.value, 10)
    );
    this.productoForm.patchValue({ colecciones_ids: values });
  }

  protected onProveedoresChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const values = Array.from(select.selectedOptions).map((option) =>
      Number.parseInt(option.value, 10)
    );
    this.productoForm.patchValue({ proveedores_ids: values });
  }

  protected guardarProducto(): void {
    this.limpiarMensajes();

    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    const value = this.productoForm.getRawValue();

    if (!value.categoria_id) {
      this.error.set('Categoria obligatoria');
      return;
    }

    this.procesando.set(true);
    const productoId = this.productoEditandoId();

    const request = {
      categoria_id: value.categoria_id,
      marca_id: value.marca_id || null,
      nombre: value.nombre,
      descripcion: value.descripcion || null,
      material: value.material || null,
      genero: value.genero || null,
      tipo_prenda: value.tipo_prenda || 'SUPERIOR',
      tipo_corte: value.tipo_corte || 'REGULAR_FIT',
      ancho_base_cm: value.ancho_base_cm !== null ? Number(value.ancho_base_cm) : 53.0,
      largo_base_cm: value.largo_base_cm !== null ? Number(value.largo_base_cm) : 72.0,
      colecciones_ids: value.colecciones_ids || [],
      proveedores_ids: value.proveedores_ids || [],
      imagenes: this.imagenesEditando(),
    };

    const operacion =
      productoId === null
        ? this.productoService.crearProducto(request)
        : this.productoService.actualizarProducto(productoId, request);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          productoId === null
            ? 'Producto creado correctamente.'
            : 'Producto actualizado correctamente.'
        );
        this.cancelarEdicion();
        this.cargarProductos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoProducto(producto: ProductoResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = producto.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.productoService.desactivarProducto(producto.id)
      : this.productoService.activarProducto(producto.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Producto desactivado correctamente.'
            : 'Producto activado correctamente.'
        );
        this.cargarProductos();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);
    return detail !== '' ? detail : 'No se pudo completar la operacion. Intenta nuevamente.';
  }

  private obtenerDetail(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'detail' in error &&
      typeof error.detail === 'string'
    ) {
      return error.detail;
    }

    return '';
  }
}
