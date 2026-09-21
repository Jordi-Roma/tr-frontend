import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';
import { TallaResponse } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-tallas-page',
  styleUrl: './tallas.page.css',
  templateUrl: './tallas.page.html',
})
export class TallasPage {
  private readonly catalogoService = inject(CatalogoService);

  protected readonly tallas = signal<TallaResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly tallaEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly filtroTipoPrenda = signal<string>('todos');

  protected readonly tallasFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    const tipo = this.filtroTipoPrenda();

    return this.tallas().filter((talla) => {
      const coincideBusqueda =
        busqueda === '' ||
        [talla.nombre, talla.descripcion ?? '', talla.tipo_prenda ?? '']
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && talla.activo) ||
        (estado === 'inactivos' && !talla.activo);

      const coincideTipo =
        tipo === 'todos' ||
        (talla.tipo_prenda || 'SUPERIOR').toUpperCase() === tipo.toUpperCase();

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  });

  protected readonly tallaForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    descripcion: new FormControl<string | null>(null),
    tipo_prenda: new FormControl<string>('SUPERIOR', { nonNullable: true }),
    ancho_cm: new FormControl<number | null>(null),
    largo_cm: new FormControl<number | null>(null),
  });

  constructor() {
    this.cargarTallas();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected actualizarFiltroTipo(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroTipoPrenda.set(select.value);
  }

  protected seleccionarTalla(talla: TallaResponse): void {
    this.tallaEditandoId.set(talla.id);
    this.tallaForm.setValue({
      nombre: talla.nombre,
      descripcion: talla.descripcion,
      tipo_prenda: talla.tipo_prenda || 'SUPERIOR',
      ancho_cm: talla.ancho_cm ?? null,
      largo_cm: talla.largo_cm ?? null,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected abrirNuevaTalla(): void {
    this.cancelarEdicion();
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.tallaEditandoId.set(null);
    this.tallaForm.reset();
  }

  protected guardarTalla(): void {
    this.limpiarMensajes();

    if (this.tallaForm.invalid) {
      this.tallaForm.markAllAsTouched();
      return;
    }

    const { nombre, descripcion, tipo_prenda, ancho_cm, largo_cm } = this.tallaForm.getRawValue();
    this.procesando.set(true);
    const tallaId = this.tallaEditandoId();

    const requestData = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      tipo_prenda: tipo_prenda || 'SUPERIOR',
      ancho_cm: ancho_cm !== null && ancho_cm !== undefined ? Number(ancho_cm) : null,
      largo_cm: largo_cm !== null && largo_cm !== undefined ? Number(largo_cm) : null,
    };

    const operacion =
      tallaId === null
        ? this.catalogoService.crearTalla(requestData)
        : this.catalogoService.actualizarTalla(tallaId, requestData);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          tallaId === null
            ? 'Talla creada correctamente.'
            : 'Talla actualizada correctamente.'
        );
        this.cancelarEdicion();
        this.formularioAbierto.set(false);
        this.cargarTallas();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoTalla(talla: TallaResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = talla.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.catalogoService.desactivarTalla(talla.id)
      : this.catalogoService.activarTalla(talla.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Talla desactivada correctamente.'
            : 'Talla activada correctamente.'
        );
        this.cargarTallas();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarTallas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogoService
      .listarTallas()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (tallas) => {
          this.tallas.set(tallas);
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
