import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ColeccionResponse, TemporadaResponse } from '../../models/catalogo.models';
import { ColeccionService } from '../../services/coleccion.service';
import { TemporadaService } from '../../services/temporada.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-colecciones-page',
  styleUrl: './colecciones.page.css',
  templateUrl: './colecciones.page.html',
})
export class ColeccionesPage {
  private readonly coleccionService = inject(ColeccionService);
  private readonly temporadaService = inject(TemporadaService);

  protected readonly colecciones = signal<ColeccionResponse[]>([]);
  protected readonly temporadas = signal<TemporadaResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('activos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly coleccionEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly temporadasActivas = computed(() => {
    return this.temporadas().filter(t => t.activo);
  });

  protected readonly coleccionesFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.colecciones().filter((coleccion) => {
      const coincideBusqueda =
        busqueda === '' ||
        [coleccion.nombre, coleccion.descripcion ?? '', coleccion.temporada_nombre]
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && coleccion.activo) ||
        (estado === 'inactivos' && !coleccion.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly coleccionForm = new FormGroup({
    temporada_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    descripcion: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarDatos();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarColeccion(coleccion: ColeccionResponse): void {
    this.coleccionEditandoId.set(coleccion.id);
    this.coleccionForm.setValue({
      temporada_id: coleccion.temporada_id,
      nombre: coleccion.nombre,
      descripcion: coleccion.descripcion,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected abrirNuevaColeccion(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.coleccionEditandoId.set(null);
    this.coleccionForm.reset();
  }

  protected guardarColeccion(): void {
    this.limpiarMensajes();

    if (this.coleccionForm.invalid) {
      this.coleccionForm.markAllAsTouched();
      return;
    }

    const { temporada_id, nombre, descripcion } = this.coleccionForm.getRawValue();
    if (!temporada_id) return;

    this.procesando.set(true);
    const coleccionId = this.coleccionEditandoId();

    const operacion: Observable<any> =
      coleccionId === null
        ? this.coleccionService.crearColeccion({ temporada_id, nombre, descripcion })
        : this.coleccionService.actualizarColeccion(coleccionId, { temporada_id, nombre, descripcion });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.cargarColecciones();
        this.cerrarFormulario();
        this.mensaje.set(
          coleccionId === null
            ? 'Colección creada exitosamente.'
            : 'Colección actualizada exitosamente.'
        );
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.detail ||
            'Ocurrió un error al guardar la colección. Por favor, intenta de nuevo.'
        );
      },
    });
  }

  protected cambiarEstadoColeccion(coleccion: ColeccionResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);

    const operacion: Observable<any> = coleccion.activo
      ? this.coleccionService.desactivarColeccion(coleccion.id)
      : this.coleccionService.activarColeccion(coleccion.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.cargarColecciones();
        if (this.coleccionEditandoId() === coleccion.id) {
          this.cancelarEdicion();
        }
        this.mensaje.set(
          coleccion.activo
            ? 'Colección desactivada exitosamente.'
            : 'Colección reactivada exitosamente.'
        );
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.detail ||
            'Ocurrió un error al cambiar el estado. Por favor, intenta de nuevo.'
        );
      },
    });
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    this.temporadaService.listarTemporadas().subscribe({
      next: (temporadas) => {
        this.temporadas.set(temporadas);
        this.cargarColecciones();
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('Error al cargar temporadas iniciales.');
      },
    });
  }

  private cargarColecciones(): void {
    this.coleccionService
      .listarColecciones()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (colecciones) => {
          this.colecciones.set(colecciones);
          this.error.set('');
        },
        error: () => {
          this.error.set(
            'Error al cargar las colecciones. Por favor, recarga la página.'
          );
        },
      });
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }
}
