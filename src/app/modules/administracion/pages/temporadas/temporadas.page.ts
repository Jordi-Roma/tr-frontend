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
import { TemporadaResponse } from '../../models/catalogo.models';
import { TemporadaService } from '../../services/temporada.service';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-temporadas-page',
  styleUrl: './temporadas.page.css',
  templateUrl: './temporadas.page.html',
})
export class TemporadasPage {
  private readonly temporadaService = inject(TemporadaService);

  protected readonly temporadas = signal<TemporadaResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('activos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly temporadaEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly temporadasFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.temporadas().filter((temporada) => {
      const coincideBusqueda =
        busqueda === '' ||
        [temporada.nombre, temporada.anio.toString()]
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && temporada.activo) ||
        (estado === 'inactivos' && !temporada.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly temporadaForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    anio: new FormControl(new Date().getFullYear(), {
      nonNullable: true,
      validators: [Validators.required, Validators.min(2000), Validators.max(2200)],
    }),
  });

  constructor() {
    this.cargarTemporadas();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarTemporada(temporada: TemporadaResponse): void {
    this.temporadaEditandoId.set(temporada.id);
    this.temporadaForm.setValue({
      nombre: temporada.nombre,
      anio: temporada.anio,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected abrirNuevaTemporada(): void {
    this.cancelarEdicion();
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.temporadaEditandoId.set(null);
    this.temporadaForm.reset({ anio: new Date().getFullYear() });
  }

  protected guardarTemporada(): void {
    this.limpiarMensajes();

    if (this.temporadaForm.invalid) {
      this.temporadaForm.markAllAsTouched();
      return;
    }

    const { nombre, anio } = this.temporadaForm.getRawValue();
    this.procesando.set(true);
    const temporadaId = this.temporadaEditandoId();

    const operacion: Observable<any> =
      temporadaId === null
        ? this.temporadaService.crearTemporada({ nombre, anio })
        : this.temporadaService.actualizarTemporada(temporadaId, { nombre, anio });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.cargarTemporadas();
        this.cancelarEdicion();
        this.formularioAbierto.set(false);
        this.mensaje.set(
          temporadaId === null
            ? 'Temporada creada exitosamente.'
            : 'Temporada actualizada exitosamente.'
        );
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.detail ||
            'Ocurrió un error al guardar la temporada. Por favor, intenta de nuevo.'
        );
      },
    });
  }

  protected cambiarEstadoTemporada(temporada: TemporadaResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);

    const operacion: Observable<any> = temporada.activo
      ? this.temporadaService.desactivarTemporada(temporada.id)
      : this.temporadaService.activarTemporada(temporada.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.cargarTemporadas();
        if (this.temporadaEditandoId() === temporada.id) {
          this.cancelarEdicion();
        }
        this.mensaje.set(
          temporada.activo
            ? 'Temporada desactivada exitosamente.'
            : 'Temporada reactivada exitosamente.'
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

  private cargarTemporadas(): void {
    this.cargando.set(true);
    this.temporadaService
      .listarTemporadas()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (temporadas) => {
          this.temporadas.set(temporadas);
          this.error.set('');
        },
        error: () => {
          this.error.set(
            'Error al cargar las temporadas. Por favor, recarga la página.'
          );
        },
      });
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }
}
