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
import { UsuarioAdminResponse } from '../../../autenticacion/models/usuario-admin.models';
import { UsuarioAdminService } from '../../../autenticacion/services/usuario-admin.service';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-proveedores-page',
  styleUrl: './proveedores.page.css',
  templateUrl: './proveedores.page.html',
})
export class ProveedoresPage {
  private readonly proveedorService = inject(ProveedorService);
  private readonly usuarioAdminService = inject(UsuarioAdminService);

  protected readonly proveedores = signal<ProveedorResponse[]>([]);
  protected readonly usuarios = signal<UsuarioAdminResponse[]>([]);
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

  protected readonly vinculoForm = new FormGroup({
    usuario_id: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  constructor() {
    this.cargarProveedores();
    this.cargarUsuarios();
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
    this.vinculoForm.reset();
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

  protected usuariosProveedor(): UsuarioAdminResponse[] {
    const proveedor = this.proveedorActual();
    if (!proveedor) {
      return [];
    }
    const ids = new Set(proveedor.usuarios_ids ?? []);
    return this.usuarios().filter((usuario) => ids.has(usuario.id));
  }

  protected usuariosDisponiblesParaVincular(): UsuarioAdminResponse[] {
    const proveedor = this.proveedorActual();
    if (!proveedor) {
      return [];
    }
    const vinculados = new Set(proveedor.usuarios_ids ?? []);
    return this.usuarios()
      .filter((usuario) => usuario.activo && usuario.roles.includes('PROVEEDOR') && !vinculados.has(usuario.id))
      .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));
  }

  protected etiquetaUsuario(usuario: UsuarioAdminResponse): string {
    return `${usuario.nombre} ${usuario.apellido} (@${usuario.username})`;
  }

  protected vincularUsuario(): void {
    const proveedorId = this.proveedorEditandoId();
    const usuarioId = this.vinculoForm.controls.usuario_id.value;
    if (proveedorId === null || usuarioId === null) {
      this.error.set('Selecciona un proveedor y un usuario proveedor.');
      return;
    }
    this.procesando.set(true);
    this.limpiarMensajes();
    this.proveedorService
      .vincularUsuario(proveedorId, usuarioId)
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (proveedor) => {
          this.actualizarProveedorEnLista(proveedor);
          this.vinculoForm.reset();
          this.mensaje.set('Usuario vinculado al proveedor.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  protected desvincularUsuario(usuarioId: number): void {
    const proveedorId = this.proveedorEditandoId();
    if (proveedorId === null) {
      return;
    }
    this.procesando.set(true);
    this.limpiarMensajes();
    this.proveedorService
      .desvincularUsuario(proveedorId, usuarioId)
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (proveedor) => {
          this.actualizarProveedorEnLista(proveedor);
          this.mensaje.set('Usuario desvinculado del proveedor.');
        },
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private proveedorActual(): ProveedorResponse | null {
    const id = this.proveedorEditandoId();
    if (id === null) {
      return null;
    }
    return this.proveedores().find((proveedor) => proveedor.id === id) ?? null;
  }

  private actualizarProveedorEnLista(proveedor: ProveedorResponse): void {
    this.proveedores.update((items) => items.map((item) => (item.id === proveedor.id ? proveedor : item)));
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

  private cargarUsuarios(): void {
    this.usuarioAdminService.listarUsuarios().subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
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
