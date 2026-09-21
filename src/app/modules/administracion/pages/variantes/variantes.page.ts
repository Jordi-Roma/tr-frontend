import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { VarianteResponse, PrecioResponse } from '../../../administracion/models/variante.models';
import { VarianteService } from '../../../administracion/services/variante.service';
import { ProductoService } from '../../services/producto.service';
import { CatalogoService } from '../../services/catalogo.service';
import { ProductoResponse } from '../../models/producto.models';
import { TallaResponse, ColorResponse } from '../../models/catalogo.models';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';

@Component({
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, AppDrawerComponent],
  selector: 'app-variantes-page',
  styleUrl: './variantes.page.css',
  templateUrl: './variantes.page.html',
})
export class VariantesPage implements OnInit {
  private readonly varianteService = inject(VarianteService);
  private readonly productoService = inject(ProductoService);
  private readonly catalogoService = inject(CatalogoService);

  protected readonly variantes = signal<VarianteResponse[]>([]);
  protected readonly productos = signal<ProductoResponse[]>([]);
  protected readonly tallas = signal<TallaResponse[]>([]);
  protected readonly colores = signal<ColorResponse[]>([]);

  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly varianteEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly preciosVariante = signal<PrecioResponse[]>([]);
  protected readonly productoSeleccionadoId = signal<number | null>(null);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly variantesFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.variantes().filter((variante) => {
      const coincideBusqueda =
        busqueda === '' ||
        [variante.sku, variante.producto_nombre, variante.talla_nombre ?? '', variante.color_nombre ?? '']
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && variante.activo) ||
        (estado === 'inactivos' && !variante.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly tallasFiltradasPorProducto = computed(() => {
    const prodId = this.productoSeleccionadoId();
    if (!prodId) return this.tallas();

    const prod = this.productos().find((p) => p.id === prodId);
    if (!prod || !prod.tipo_prenda) return this.tallas();

    const tipo = prod.tipo_prenda.toUpperCase();
    const filtradas = this.tallas().filter(
      (t) => (t.tipo_prenda || 'SUPERIOR').toUpperCase() === tipo
    );
    return filtradas.length > 0 ? filtradas : this.tallas();
  });

  protected readonly varianteForm = new FormGroup({
    producto_id: new FormControl<number | null>(null, [Validators.required]),
    talla_id: new FormControl<number | null>(null),
    color_id: new FormControl<number | null>(null),
    sku: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    ancho_cm: new FormControl<number | null>(null),
    largo_cm: new FormControl<number | null>(null),
  });

  protected readonly precioForm = new FormGroup({
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fecha_inicio: new FormControl<string | null>(null),
    fecha_fin: new FormControl<string | null>(null),
  });

  ngOnInit() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.productoService.listarProductos().subscribe(data => this.productos.set(data.filter(p => p.activo)));
    this.catalogoService.listarTallas().subscribe(data => this.tallas.set(data.filter(t => t.activo)));
    this.catalogoService.listarColores().subscribe(data => this.colores.set(data.filter(c => c.activo)));

    this.cargarVariantes();
  }

  private cargarVariantes(): void {
    this.cargando.set(true);
    this.varianteService
      .listarVariantes()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (variantes) => {
          this.variantes.set(variantes);
        },
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

  protected seleccionarVariante(variante: VarianteResponse): void {
    this.varianteEditandoId.set(variante.id);
    this.productoSeleccionadoId.set(variante.producto_id);
    this.preciosVariante.set(variante.precios);
    this.varianteForm.reset();
    
    // Disable producto_id when editing (it shouldn't be changed)
    this.varianteForm.get('producto_id')?.disable();

    this.varianteForm.patchValue({
      producto_id: variante.producto_id,
      talla_id: variante.talla_id,
      color_id: variante.color_id,
      sku: variante.sku,
      ancho_cm: variante.ancho_cm ?? null,
      largo_cm: variante.largo_cm ?? null,
    });
    
    this.precioForm.reset();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected onProductoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const prodId = select.value ? Number(select.value) : null;
    this.productoSeleccionadoId.set(prodId);
  }

  protected onTallaChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const tallaId = select.value ? Number(select.value) : null;
    if (tallaId) {
      const talla = this.tallas().find((t) => t.id === tallaId);
      if (talla) {
        this.varianteForm.patchValue({
          ancho_cm: talla.ancho_cm ?? null,
          largo_cm: talla.largo_cm ?? null,
        });
      }
    }
  }

  protected abrirNuevaVariante(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
  }

  protected cancelarEdicion(): void {
    this.varianteEditandoId.set(null);
    this.productoSeleccionadoId.set(null);
    this.preciosVariante.set([]);
    this.varianteForm.reset();
    this.varianteForm.get('producto_id')?.enable();
    this.precioForm.reset();
    this.formularioAbierto.set(false);
  }

  protected guardarVariante(): void {
    this.limpiarMensajes();

    if (this.varianteForm.invalid) {
      this.varianteForm.markAllAsTouched();
      return;
    }

    const val = this.varianteForm.getRawValue();
    this.procesando.set(true);
    const varianteId = this.varianteEditandoId();
    
    let operacion: Observable<VarianteResponse>;
    
    if (varianteId === null) {
        if (!val.producto_id) {
            this.error.set("Producto obligatorio");
            this.procesando.set(false);
            return;
        }
        operacion = this.varianteService.crearVariante({
            producto_id: val.producto_id,
            talla_id: val.talla_id || null,
            color_id: val.color_id || null,
            sku: val.sku,
            ancho_cm: val.ancho_cm !== null && val.ancho_cm !== undefined ? Number(val.ancho_cm) : null,
            largo_cm: val.largo_cm !== null && val.largo_cm !== undefined ? Number(val.largo_cm) : null,
        });
    } else {
        operacion = this.varianteService.actualizarVariante(varianteId, {
            talla_id: val.talla_id || null,
            color_id: val.color_id || null,
            sku: val.sku,
            ancho_cm: val.ancho_cm !== null && val.ancho_cm !== undefined ? Number(val.ancho_cm) : null,
            largo_cm: val.largo_cm !== null && val.largo_cm !== undefined ? Number(val.largo_cm) : null,
        });
    }

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (resp) => {
        this.mensaje.set(
          varianteId === null
            ? 'Variante creada correctamente.'
            : 'Variante actualizada correctamente.'
        );
        if (varianteId === null) {
            // Stay on the form to let them add prices to the new variant
            this.seleccionarVariante(resp);
        } else {
            // Update prices list
            this.preciosVariante.set(resp.precios);
        }
        this.cargarVariantes();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }
  
  protected asignarPrecio(): void {
      this.limpiarMensajes();
      
      const varianteId = this.varianteEditandoId();
      if (!varianteId) {
          this.error.set("Debe seleccionar o guardar la variante primero.");
          return;
      }
      
      if (this.precioForm.invalid) {
          this.precioForm.markAllAsTouched();
          return;
      }
      
      const val = this.precioForm.getRawValue();
      if (!val.monto) {
          this.error.set("El monto es obligatorio.");
          return;
      }
      
      this.procesando.set(true);
      
      const request = {
          monto: val.monto,
          fecha_inicio: val.fecha_inicio || null,
          fecha_fin: val.fecha_fin || null
      };
      
      this.varianteService.asignarPrecio(varianteId, request).pipe(finalize(() => this.procesando.set(false))).subscribe({
          next: (resp) => {
              this.mensaje.set('Precio asignado correctamente.');
              this.preciosVariante.set(resp.precios);
              this.precioForm.reset();
              this.cargarVariantes();
          },
          error: (error: HttpErrorResponse) => {
              this.error.set(this.obtenerMensajeError(error));
          }
      });
  }

  protected cambiarEstadoVariante(variante: VarianteResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = variante.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.varianteService.desactivarVariante(variante.id)
      : this.varianteService.activarVariante(variante.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Variante desactivada correctamente.'
            : 'Variante activada correctamente.'
        );
        this.cargarVariantes();
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
    return detail !== '' ? detail : 'No se pudo completar la operación. Intenta nuevamente.';
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
