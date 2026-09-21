import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { SucursalResponse } from '../../models/ciudad-sucursal.models';
import { EmpleadoResponse } from '../../models/empleado.models';
import { CiudadSucursalService } from '../../services/ciudad-sucursal.service';
import { EmpleadoService } from '../../services/empleado.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-empleados-page',
  styleUrl: './empleados.page.css',
  templateUrl: './empleados.page.html',
})
export class EmpleadosPage {
  private readonly empleadoService = inject(EmpleadoService);
  private readonly ciudadSucursalService = inject(CiudadSucursalService);

  protected readonly empleados = signal<EmpleadoResponse[]>([]);
  protected readonly sucursales = signal<SucursalResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly empleadoEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly rolesDisponibles = [
    { valor: 'ENCARGADO_SUCURSAL', etiqueta: 'Encargado de Sucursal' },
    { valor: 'CAJERO', etiqueta: 'Cajero' },
    { valor: 'PERSONAL_VENTAS', etiqueta: 'Personal de Ventas' },
    { valor: 'ADMINISTRADOR', etiqueta: 'Administrador' },
  ];

  protected readonly empleadosFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();

    if (busqueda === '') {
      return this.empleados();
    }

    return this.empleados().filter((empleado) => {
      const texto = [
        empleado.nombre,
        empleado.apellido,
        empleado.username,
        empleado.correo,
        empleado.cargo,
        empleado.sucursal_nombre,
        empleado.codigo_empleado,
      ]
        .join(' ')
        .toLowerCase();

      return texto.includes(busqueda);
    });
  });

  protected readonly empleadoForm = new FormGroup({
    usuarioId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    sucursalId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    codigoEmpleado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    cargo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    rol: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  constructor() {
    this.cargarDatos();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected seleccionarEmpleado(empleado: EmpleadoResponse): void {
    this.empleadoEditandoId.set(empleado.empleado_id);
    this.empleadoForm.setValue({
      usuarioId: empleado.usuario_id,
      sucursalId: empleado.sucursal_id,
      codigoEmpleado: empleado.codigo_empleado,
      cargo: empleado.cargo,
      rol: empleado.roles[0] ?? '',
    });
    this.empleadoForm.controls.usuarioId.disable();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }


  protected abrirNuevoEmpleado(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.empleadoEditandoId.set(null);
    this.empleadoForm.reset();
    this.empleadoForm.controls.usuarioId.enable();
  }

  protected guardarEmpleado(): void {
    this.limpiarMensajes();

    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    const { usuarioId, sucursalId, codigoEmpleado, cargo, rol } =
      this.empleadoForm.getRawValue();

    if (sucursalId === null || (usuarioId === null && this.empleadoEditandoId() === null)) {
      this.error.set('Debes indicar usuario y sucursal.');
      return;
    }

    this.procesando.set(true);
    const empleadoId = this.empleadoEditandoId();
    const request = {
      sucursal_id: sucursalId,
      codigo_empleado: codigoEmpleado.trim(),
      cargo: cargo.trim(),
      rol: rol.trim().toUpperCase(),
    };
    const operacion =
      empleadoId === null
        ? this.empleadoService.crearEmpleado({
            usuario_id: Number(usuarioId),
            ...request,
          })
        : this.empleadoService.actualizarEmpleado(empleadoId, request);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          empleadoId === null
            ? 'Empleado creado correctamente.'
            : 'Empleado actualizado correctamente.'
        );
        this.cancelarEdicion();
        this.cargarEmpleados();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoEmpleado(empleado: EmpleadoResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const rol = empleado.roles[0] ?? 'ENCARGADO_SUCURSAL';
    const operacion: Observable<unknown> = empleado.activo
      ? this.empleadoService.desactivarEmpleado(empleado.empleado_id)
      : this.empleadoService.activarEmpleado(empleado.empleado_id, { rol });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          empleado.activo
            ? 'Empleado desactivado correctamente.'
            : 'Empleado activado correctamente.'
        );
        this.cargarEmpleados();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarDatos(): void {
    this.cargarEmpleados();
    this.ciudadSucursalService.listarSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales.set(sucursales);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarEmpleados(): void {
    this.cargando.set(true);
    this.error.set('');

    this.empleadoService
      .listarEmpleados()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (empleados) => {
          this.empleados.set(empleados);
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
