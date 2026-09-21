import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { RolResponse } from '../../models/rol-permiso.models';
import { RolPermisoService } from '../../services/rol-permiso.service';
import { UsuarioAdminResponse } from '../../models/usuario-admin.models';
import { UsuarioAdminService } from '../../services/usuario-admin.service';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-usuarios-page',
  styleUrl: './usuarios.page.css',
  templateUrl: './usuarios.page.html',
})
export class UsuariosPage {
  private readonly usuarioAdminService = inject(UsuarioAdminService);
  private readonly rolPermisoService = inject(RolPermisoService);

  protected readonly usuarios = signal<UsuarioAdminResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly usuarioEditandoId = signal<number | null>(null);
  protected readonly mostrarCreacion = signal(false);
  protected readonly roles = signal<RolResponse[]>([]);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly busquedaControl = new FormControl('', {
    nonNullable: true,
  });

  protected readonly usuariosFiltrados = computed(() => {
    const busqueda = this.busquedaControl.value.trim().toLowerCase();

    if (busqueda === '') {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) => {
      const texto = [
        usuario.nombre,
        usuario.apellido,
        usuario.username,
        usuario.correo,
      ]
        .join(' ')
        .toLowerCase();

      return texto.includes(busqueda);
    });
  });

  protected readonly editarUsuarioForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    apellido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(4),
        Validators.pattern(USERNAME_PATTERN),
      ],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly crearUsuarioForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apellido: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.pattern(USERNAME_PATTERN)],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    rolId: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  protected readonly rolForm = new FormGroup({
    usuarioId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    rolId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  constructor() {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  protected abrirCreacion(): void {
    this.mostrarCreacion.set(true);
    this.usuarioEditandoId.set(null);
    this.limpiarMensajes();
  }

  protected cancelarCreacion(): void {
    this.mostrarCreacion.set(false);
    this.crearUsuarioForm.reset();
  }

  protected crearUsuario(): void {
    this.limpiarMensajes();
    if (this.crearUsuarioForm.invalid) {
      this.crearUsuarioForm.markAllAsTouched();
      return;
    }

    const datos = this.crearUsuarioForm.getRawValue();
    if (datos.rolId === null) return;

    this.procesando.set(true);
    this.usuarioAdminService.crearUsuario({
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      username: datos.username.trim().toLowerCase(),
      correo: datos.correo.trim().toLowerCase(),
      password: datos.password,
      rol_id: datos.rolId,
    }).pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set('Usuario creado correctamente.');
        this.cancelarCreacion();
        this.cargarUsuarios();
      },
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  private cargarRoles(): void {
    this.rolPermisoService.listarRoles().subscribe({
      next: (roles) => this.roles.set(roles.filter((rol) => rol.activo)),
      error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
    });
  }

  protected cargarUsuarios(): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuarioAdminService
      .listarUsuarios()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected seleccionarUsuario(usuario: UsuarioAdminResponse): void {
    this.usuarioEditandoId.set(usuario.id);
    this.editarUsuarioForm.setValue({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      username: usuario.username,
      correo: usuario.correo,
    });
    this.rolForm.controls.usuarioId.setValue(usuario.id);
    this.limpiarMensajes();
  }

  protected cancelarEdicion(): void {
    this.usuarioEditandoId.set(null);
    this.editarUsuarioForm.reset();
  }

  protected guardarUsuario(): void {
    this.limpiarMensajes();

    if (this.editarUsuarioForm.invalid || this.usuarioEditandoId() === null) {
      this.editarUsuarioForm.markAllAsTouched();
      return;
    }

    const usuarioId = this.usuarioEditandoId();

    if (usuarioId === null) {
      return;
    }

    this.procesando.set(true);
    const { nombre, apellido, username, correo } =
      this.editarUsuarioForm.getRawValue();

    this.usuarioAdminService
      .actualizarUsuario(usuarioId, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        username: username.trim().toLowerCase(),
        correo: correo.trim().toLowerCase(),
      })
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: () => {
          this.mensaje.set('Usuario actualizado correctamente.');
          this.cancelarEdicion();
          this.cargarUsuarios();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected cambiarEstadoUsuario(usuario: UsuarioAdminResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = usuario.activo
      ? this.usuarioAdminService.desactivarUsuario(usuario.id)
      : this.usuarioAdminService.activarUsuario(usuario.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarUsuarios();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected asignarRol(): void {
    this.ejecutarAccionRol('asignar');
  }

  protected desactivarRol(): void {
    this.ejecutarAccionRol('desactivar');
  }

  protected activarRol(): void {
    this.ejecutarAccionRol('activar');
  }

  private ejecutarAccionRol(accion: 'asignar' | 'desactivar' | 'activar'): void {
    this.limpiarMensajes();

    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }

    const { usuarioId, rolId } = this.rolForm.getRawValue();

    if (usuarioId === null || rolId === null) {
      this.error.set('Debes indicar usuario y rol.');
      return;
    }

    this.procesando.set(true);
    const operacion =
      accion === 'asignar'
        ? this.usuarioAdminService.asignarRol(usuarioId, rolId)
        : accion === 'desactivar'
          ? this.usuarioAdminService.desactivarRol(usuarioId, rolId)
          : this.usuarioAdminService.activarRol(usuarioId, rolId);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarUsuarios();
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
