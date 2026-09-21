import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { MarcaResponse } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-marcas-page',
  styleUrl: './marcas.page.css',
  templateUrl: './marcas.page.html',
})
export class MarcasPage {
  private readonly catalogoService = inject(CatalogoService);

  protected readonly marcas = signal<MarcaResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly marcaEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly marcasFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.marcas().filter((marca) => {
      const coincideBusqueda =
        busqueda === '' ||
        [marca.nombre, marca.descripcion ?? '']
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && marca.activo) ||
        (estado === 'inactivos' && !marca.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly marcaForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    descripcion: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarMarcas();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarMarca(marca: MarcaResponse): void {
    this.marcaEditandoId.set(marca.id);
    this.marcaForm.setValue({
      nombre: marca.nombre,
      descripcion: marca.descripcion,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected abrirNuevaMarca(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.marcaEditandoId.set(null);
    this.marcaForm.reset();
  }

  protected guardarMarca(): void {
    this.limpiarMensajes();

    if (this.marcaForm.invalid) {
      this.marcaForm.markAllAsTouched();
      return;
    }

    const { nombre, descripcion } = this.marcaForm.getRawValue();
    this.procesando.set(true);
    const marcaId = this.marcaEditandoId();

    const operacion =
      marcaId === null
        ? this.catalogoService.crearMarca({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
          })
        : this.catalogoService.actualizarMarca(marcaId, {
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
          });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          marcaId === null
            ? 'Marca creada correctamente.'
            : 'Marca actualizada correctamente.'
        );
        this.cancelarEdicion();
        this.cargarMarcas();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoMarca(marca: MarcaResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = marca.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.catalogoService.desactivarMarca(marca.id)
      : this.catalogoService.activarMarca(marca.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Marca desactivada correctamente.'
            : 'Marca activada correctamente.'
        );
        this.cargarMarcas();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarMarcas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogoService
      .listarMarcas()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (marcas) => {
          this.marcas.set(marcas);
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
