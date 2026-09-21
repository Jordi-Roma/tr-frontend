import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ProveedorResponse } from '../../models/proveedor.models';
import { ProveedorService } from '../../services/proveedor.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-proveedores-page',
  styleUrl: './proveedores.page.css',
  templateUrl: './proveedores.page.html',
})
export class ProveedoresPage {
  private readonly proveedorService = inject(ProveedorService);

  protected readonly proveedores = signal<ProveedorResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly proveedorEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly proveedoresFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.proveedores().filter((proveedor) => {
      const coincideBusqueda =
        busqueda === '' ||
        [
          proveedor.nombre,
          proveedor.nit ?? '',
          proveedor.correo ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(busqueda);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && proveedor.activo) ||
        (estado === 'inactivos' && !proveedor.activo);

      return coincideBusqueda && coincideEstado;
    });
  });

  protected readonly proveedorForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    nit: new FormControl<string | null>(null),
    telefono: new FormControl<string | null>(null),
    correo: new FormControl<string | null>(null, {
      validators: [Validators.email],
    }),
    direccion: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarProveedores();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(
      select.value as 'todos' | 'activos' | 'inactivos'
    );
  }

  protected seleccionarProveedor(proveedor: ProveedorResponse): void {
    this.proveedorEditandoId.set(proveedor.id);
    this.proveedorForm.setValue({
      nombre: proveedor.nombre,
      nit: proveedor.nit,
      telefono: proveedor.telefono,
      correo: proveedor.correo,
      direccion: proveedor.direccion,
    });
    this.proveedorForm.controls.nit.disable();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected abrirNuevoProveedor(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.proveedorEditandoId.set(null);
    this.proveedorForm.reset();
    this.proveedorForm.controls.nit.enable();
  }

  protected guardarProveedor(): void {
    this.limpiarMensajes();

    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      return;
    }

    const { nombre, nit, telefono, correo, direccion } =
      this.proveedorForm.getRawValue();

    this.procesando.set(true);
    const proveedorId = this.proveedorEditandoId();

    const operacion =
      proveedorId === null
        ? this.proveedorService.crearProveedor({
            nombre: nombre.trim(),
            nit: nit?.trim() || null,
            telefono: telefono?.trim() || null,
            correo: correo?.trim() || null,
            direccion: direccion?.trim() || null,
          })
        : this.proveedorService.actualizarProveedor(proveedorId, {
            nombre: nombre.trim(),
            telefono: telefono?.trim() || null,
            correo: correo?.trim() || null,
            direccion: direccion?.trim() || null,
          });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          proveedorId === null
            ? 'Proveedor creado correctamente.'
            : 'Proveedor actualizado correctamente.'
        );
        this.cancelarEdicion();
        this.cargarProveedores();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoProveedor(proveedor: ProveedorResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);

    const esActivo = proveedor.activo;
    const operacion$: Observable<unknown> = esActivo
      ? this.proveedorService.desactivarProveedor(proveedor.id)
      : this.proveedorService.activarProveedor(proveedor.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Proveedor desactivado correctamente.'
            : 'Proveedor activado correctamente.'
        );
        this.cargarProveedores();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarProveedores(): void {
    this.cargando.set(true);
    this.error.set('');

    this.proveedorService
      .listarProveedores()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (proveedores) => {
          this.proveedores.set(proveedores);
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
