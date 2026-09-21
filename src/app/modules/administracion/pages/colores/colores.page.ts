import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ColorResponse } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-colores-page',
  styleUrl: './colores.page.css',
  templateUrl: './colores.page.html',
})
export class ColoresPage {
  private readonly catalogoService = inject(CatalogoService);

  protected readonly colores = signal<ColorResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly colorEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly coloresFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.colores().filter((color) => {
      const coincideBusqueda =
        busqueda === '' ||
        [color.nombre, color.codigo_hex ?? '']
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && color.activo) ||
        (estado === 'inactivos' && !color.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly colorForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    codigo_hex: new FormControl<string | null>(null, {
      validators: [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    }),
  });

  constructor() {
    this.cargarColores();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarColor(color: ColorResponse): void {
    this.colorEditandoId.set(color.id);
    this.colorForm.setValue({
      nombre: color.nombre,
      codigo_hex: color.codigo_hex,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected abrirNuevoColor(): void {
    this.cancelarEdicion();
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected cancelarEdicion(): void {
    this.colorEditandoId.set(null);
    this.colorForm.reset();
    this.formularioAbierto.set(false);
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
  }

  protected guardarColor(): void {
    this.limpiarMensajes();

    if (this.colorForm.invalid) {
      this.colorForm.markAllAsTouched();
      return;
    }

    const { nombre, codigo_hex } = this.colorForm.getRawValue();
    this.procesando.set(true);
    const colorId = this.colorEditandoId();

    const hex = codigo_hex?.trim() || null;

    const operacion =
      colorId === null
        ? this.catalogoService.crearColor({
            nombre: nombre.trim(),
            codigo_hex: hex,
          })
        : this.catalogoService.actualizarColor(colorId, {
            nombre: nombre.trim(),
            codigo_hex: hex,
          });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          colorId === null
            ? 'Color creado correctamente.'
            : 'Color actualizado correctamente.'
        );
        this.cancelarEdicion();
        this.cargarColores();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoColor(color: ColorResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = color.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.catalogoService.desactivarColor(color.id)
      : this.catalogoService.activarColor(color.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Color desactivado correctamente.'
            : 'Color activado correctamente.'
        );
        this.cargarColores();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarColores(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogoService
      .listarColores()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (colores) => {
          this.colores.set(colores);
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
