import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProductoResponse } from '../../models/producto.models';
import { PromocionRequest, PromocionResponse, TipoDescuento } from '../../models/promocion.models';
import { ProductoService } from '../../services/producto.service';
import { PromocionService } from '../../services/promocion.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-promociones-page',
  styleUrls: ['../admin-crud.shared.css', './promociones.page.css'],
  templateUrl: './promociones.page.html',
})
export class PromocionesPage {
  private readonly promocionService = inject(PromocionService);
  private readonly productoService = inject(ProductoService);

  protected readonly promociones = signal<PromocionResponse[]>([]);
  protected readonly productos = signal<ProductoResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly promocionEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly productoIdsSeleccionados = signal<Set<number>>(new Set());

  protected readonly promocionesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (texto === '') return this.promociones();
    return this.promociones().filter((promocion) => {
      const contenido = [
        promocion.nombre,
        promocion.descripcion ?? '',
        promocion.tipo_descuento,
        promocion.productos.map((producto) => producto.nombre).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return contenido.includes(texto);
    });
  });

  protected readonly productosActivos = computed(() =>
    this.productos().filter((producto) => producto.activo)
  );

  protected readonly promocionForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    descripcion: new FormControl<string | null>(null),
    tipoDescuento: new FormControl<TipoDescuento>('PORCENTAJE', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    valor: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    fechaInicio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fechaFin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.cargarPromociones();
    this.cargarProductos();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected abrirNuevaPromocion(): void {
    this.promocionEditandoId.set(null);
    this.productoIdsSeleccionados.set(new Set());
    this.promocionForm.reset({
      nombre: '',
      descripcion: null,
      tipoDescuento: 'PORCENTAJE',
      valor: null,
      fechaInicio: '',
      fechaFin: '',
    });
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected editarPromocion(promocion: PromocionResponse): void {
    this.promocionEditandoId.set(promocion.id);
    this.productoIdsSeleccionados.set(new Set(promocion.productos.map((producto) => producto.id)));
    this.promocionForm.setValue({
      nombre: promocion.nombre,
      descripcion: promocion.descripcion,
      tipoDescuento: promocion.tipo_descuento,
      valor: Number(promocion.valor),
      fechaInicio: promocion.fecha_inicio,
      fechaFin: promocion.fecha_fin,
    });
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected cancelarFormulario(): void {
    this.formularioAbierto.set(false);
    this.promocionEditandoId.set(null);
    this.productoIdsSeleccionados.set(new Set());
    this.promocionForm.reset({
      nombre: '',
      descripcion: null,
      tipoDescuento: 'PORCENTAJE',
      valor: null,
      fechaInicio: '',
      fechaFin: '',
    });
  }

  protected guardarPromocion(): void {
    this.limpiarMensajes();

    if (this.promocionForm.invalid || this.productoIdsSeleccionados().size === 0) {
      this.promocionForm.markAllAsTouched();
      if (this.productoIdsSeleccionados().size === 0) {
        this.error.set('Selecciona al menos un producto para la promocion.');
      }
      return;
    }

    const request = this.construirRequest();
    const promocionId = this.promocionEditandoId();
    const operacion =
      promocionId === null
        ? this.promocionService.crearPromocion(request)
        : this.promocionService.actualizarPromocion(promocionId, request);

    this.procesando.set(true);
    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          promocionId === null
            ? 'Promocion creada correctamente.'
            : 'Promocion actualizada correctamente.'
        );
        this.cancelarFormulario();
        this.cargarPromociones();
      },
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  protected cambiarEstado(promocion: PromocionResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = promocion.activo
      ? this.promocionService.desactivarPromocion(promocion.id)
      : this.promocionService.activarPromocion(promocion.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(promocion.activo ? 'Promocion desactivada.' : 'Promocion activada.');
        this.cargarPromociones();
      },
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  protected productoSeleccionado(productoId: number): boolean {
    return this.productoIdsSeleccionados().has(productoId);
  }

  protected alternarProducto(productoId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.productoIdsSeleccionados.update((actuales) => {
      const siguientes = new Set(actuales);
      if (input.checked) {
        siguientes.add(productoId);
      } else {
        siguientes.delete(productoId);
      }
      return siguientes;
    });
  }

  protected resumenDescuento(promocion: PromocionResponse): string {
    return promocion.tipo_descuento === 'PORCENTAJE'
      ? `${Number(promocion.valor)}%`
      : `Bs ${Number(promocion.valor).toFixed(2)}`;
  }

  protected resumenProductos(promocion: PromocionResponse): string {
    if (promocion.productos.length === 0) return 'Sin productos';
    return promocion.productos.map((producto) => producto.nombre).join(', ');
  }

  private cargarPromociones(): void {
    this.cargando.set(true);
    this.promocionService
      .listarPromociones()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (promociones) => this.promociones.set(promociones),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private cargarProductos(): void {
    this.productoService.listarProductos().subscribe({
      next: (productos) => this.productos.set(productos),
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  private construirRequest(): PromocionRequest {
    const { nombre, descripcion, tipoDescuento, valor, fechaInicio, fechaFin } =
      this.promocionForm.getRawValue();

    return {
      nombre: nombre.trim(),
      descripcion: this.limpiarTextoOpcional(descripcion),
      tipo_descuento: tipoDescuento,
      valor: Number(valor ?? 0),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      producto_ids: Array.from(this.productoIdsSeleccionados()),
      sucursal_ids: [],
    };
  }

  private limpiarTextoOpcional(valor: string | null): string | null {
    if (valor === null) return null;
    const limpio = valor.trim();
    return limpio === '' ? null : limpio;
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);
    return detail || 'No se pudo completar la operacion. Intenta nuevamente.';
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
