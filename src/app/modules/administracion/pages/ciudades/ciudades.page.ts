import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { CiudadResponse } from '../../models/ciudad-sucursal.models';
import { CiudadSucursalService } from '../../services/ciudad-sucursal.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-ciudades-page',
  styleUrl: './ciudades.page.css',
  templateUrl: './ciudades.page.html',
})
export class CiudadesPage {
  private readonly ciudadSucursalService = inject(CiudadSucursalService);

  protected readonly ciudades = signal<CiudadResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly ciudadEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly ciudadesFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();

    if (busqueda === '') {
      return this.ciudades();
    }

    return this.ciudades().filter((ciudad) => {
      const texto = [ciudad.nombre, ciudad.departamento ?? '']
        .join(' ')
        .toLowerCase();
      return texto.includes(busqueda);
    });
  });

  protected readonly ciudadForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    departamento: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarCiudades();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected seleccionarCiudad(ciudad: CiudadResponse): void {
    this.ciudadEditandoId.set(ciudad.id);
    this.ciudadForm.setValue({
      nombre: ciudad.nombre,
      departamento: ciudad.departamento,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected abrirNuevaCiudad(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.ciudadEditandoId.set(null);
    this.ciudadForm.reset();
  }

  protected guardarCiudad(): void {
    this.limpiarMensajes();

    if (this.ciudadForm.invalid) {
      this.ciudadForm.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    const { nombre, departamento } = this.ciudadForm.getRawValue();
    const request = {
      nombre: nombre.trim(),
      departamento: this.limpiarTextoOpcional(departamento),
    };
    const ciudadId = this.ciudadEditandoId();
    const operacion =
      ciudadId === null
        ? this.ciudadSucursalService.crearCiudad(request)
        : this.ciudadSucursalService.actualizarCiudad(ciudadId, request);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          ciudadId === null
            ? 'Ciudad creada correctamente.'
            : 'Ciudad actualizada correctamente.'
        );
        this.cancelarEdicion();
        this.cargarCiudades();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoCiudad(ciudad: CiudadResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = ciudad.activo
      ? this.ciudadSucursalService.desactivarCiudad(ciudad.id)
      : this.ciudadSucursalService.activarCiudad(ciudad.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarCiudades();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarCiudades(): void {
    this.cargando.set(true);
    this.error.set('');

    this.ciudadSucursalService
      .listarCiudades()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (ciudades) => {
          this.ciudades.set(ciudades);
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

  private limpiarTextoOpcional(valor: string | null): string | null {
    if (valor === null) {
      return null;
    }

    const limpio = valor.trim();
    return limpio === '' ? null : limpio;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);

    if (detail !== '') {
      return detail;
    }

    return 'No se pudo completar la operación. Intenta nuevamente.';
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
