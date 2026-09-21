import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';
import { PermisoResponse, RolResponse } from '../../models/rol-permiso.models';
import { RolPermisoService } from '../../services/rol-permiso.service';

interface ModuloPermisos {
  codigo: string;
  label: string;
  permisos: PermisoResponse[];
  seleccionados: number;
  activos: number;
  inactivos: number;
  total: number;
}

const MODULOS_ORDENADOS = [
  { codigo: 'AUTENTICACION', label: 'Autenticación' },
  { codigo: 'ADMINISTRACION', label: 'Administración' },
  { codigo: 'CATALOGO', label: 'Catálogo' },
  { codigo: 'RESERVAS', label: 'Reservas' },
  { codigo: 'VENTAS_INVENTARIO', label: 'Ventas e inventario' },
  { codigo: 'INTELIGENCIA', label: 'Inteligencia' },
];

@Component({
  imports: [ReactiveFormsModule, AppModalComponent, AppDrawerComponent],
  selector: 'app-roles-page',
  styleUrl: './roles.page.css',
  templateUrl: './roles.page.html',
})
export class RolesPage {
  private readonly rolPermisoService = inject(RolPermisoService);

  protected readonly roles = signal<RolResponse[]>([]);
  protected readonly permisos = signal<PermisoResponse[]>([]);
  protected readonly permisosSeleccionados = signal<number[]>([]);
  protected readonly rolPermisosEditando = signal<RolResponse | null>(null);
  protected readonly busqueda = signal('');
  protected readonly busquedaPermiso = signal('');
  protected readonly cargando = signal(false);
  protected readonly cargandoPermisosRol = signal(false);
  protected readonly procesando = signal(false);
  protected readonly rolEditandoId = signal<number | null>(null);
  protected readonly rolFormAbierto = signal(false);
  protected readonly permisoFormAbierto = signal(false);
  protected readonly permisoEditorAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly rolesFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();

    if (busqueda === '') {
      return this.roles();
    }

    return this.roles().filter((rol) => {
      const texto = [rol.nombre, rol.descripcion ?? ''].join(' ').toLowerCase();
      return texto.includes(busqueda);
    });
  });

  protected readonly permisosPorModulo = computed<ModuloPermisos[]>(() => {
    const seleccionados = new Set(this.permisosSeleccionados());
    return this.agruparPermisos(this.permisos(), seleccionados);
  });

  protected readonly permisosCatalogoPorModulo = computed<ModuloPermisos[]>(() => {
    const busqueda = this.busquedaPermiso().trim().toLowerCase();
    const permisosFiltrados =
      busqueda === ''
        ? this.permisos()
        : this.permisos().filter((permiso) => {
            const texto = [
              permiso.nombre,
              permiso.accion,
              permiso.modulo,
              permiso.descripcion ?? '',
            ]
              .join(' ')
              .toLowerCase();

            return texto.includes(busqueda);
          });

    return this.agruparPermisos(permisosFiltrados, new Set<number>());
  });

  protected readonly totalPermisosSeleccionados = computed(
    () => this.permisosSeleccionados().length
  );

  protected readonly totalPermisosCatalogo = computed(() =>
    this.permisosCatalogoPorModulo().reduce(
      (total, grupo) => total + grupo.total,
      0
    )
  );

  protected readonly tituloEditorPermisos = computed(() => {
    const rol = this.rolPermisosEditando();
    return rol === null ? 'Permisos del rol' : `Permisos de ${rol.nombre}`;
  });

  protected readonly rolForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    descripcion: new FormControl<string | null>(null),
  });

  protected readonly permisoForm = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    modulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    accion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
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

  protected actualizarBusquedaPermiso(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaPermiso.set(input.value);
  }

  protected cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      roles: this.rolPermisoService.listarRoles(),
      permisos: this.rolPermisoService.listarPermisos(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ roles, permisos }) => {
          this.roles.set(roles);
          this.permisos.set(permisos);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected seleccionarRol(rol: RolResponse): void {
    this.rolEditandoId.set(rol.id);
    this.rolForm.setValue({
      nombre: rol.nombre,
      descripcion: rol.descripcion,
    });
    this.limpiarMensajes();
    this.rolFormAbierto.set(true);
  }

  protected abrirNuevoRol(): void {
    this.cancelarEdicionRol();
    this.limpiarMensajes();
    this.rolFormAbierto.set(true);
  }

  protected cerrarRolForm(): void {
    this.cancelarEdicionRol();
    this.rolFormAbierto.set(false);
  }

  protected abrirNuevoPermiso(): void {
    this.permisoForm.reset();
    this.limpiarMensajes();
    this.permisoFormAbierto.set(true);
  }

  protected cerrarPermisoForm(): void {
    this.permisoForm.reset();
    this.permisoFormAbierto.set(false);
  }

  protected abrirEditorPermisos(rol: RolResponse): void {
    this.limpiarMensajes();
    this.rolPermisosEditando.set(rol);
    this.permisosSeleccionados.set([]);
    this.permisoEditorAbierto.set(true);
    this.cargandoPermisosRol.set(true);

    this.rolPermisoService
      .obtenerPermisosRol(rol.id)
      .pipe(finalize(() => this.cargandoPermisosRol.set(false)))
      .subscribe({
        next: (response) => {
          this.permisosSeleccionados.set(response.permiso_ids);
          this.actualizarRolEnLista(response.rol);
          this.rolPermisosEditando.set(response.rol);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected cerrarEditorPermisos(): void {
    this.permisoEditorAbierto.set(false);
    this.rolPermisosEditando.set(null);
    this.permisosSeleccionados.set([]);
  }

  protected cancelarEdicionRol(): void {
    this.rolEditandoId.set(null);
    this.rolForm.reset();
  }

  protected guardarRol(): void {
    this.limpiarMensajes();

    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    const { nombre, descripcion } = this.rolForm.getRawValue();
    const request = {
      nombre: nombre.trim().toUpperCase(),
      descripcion: this.limpiarTextoOpcional(descripcion),
    };
    const rolId = this.rolEditandoId();
    const operacion =
      rolId === null
        ? this.rolPermisoService.crearRol(request)
        : this.rolPermisoService.actualizarRol(rolId, request);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          rolId === null
            ? 'Rol creado correctamente.'
            : 'Rol actualizado correctamente.'
        );
        this.cancelarEdicionRol();
        this.rolFormAbierto.set(false);
        this.cargarRoles();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoRol(rol: RolResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = rol.activo
      ? this.rolPermisoService.desactivarRol(rol.id)
      : this.rolPermisoService.activarRol(rol.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarRoles();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected crearPermiso(): void {
    this.limpiarMensajes();

    if (this.permisoForm.invalid) {
      this.permisoForm.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    const { nombre, modulo, accion, descripcion } = this.permisoForm.getRawValue();

    this.rolPermisoService
      .crearPermiso({
        nombre: nombre.trim(),
        modulo: this.normalizarModulo(modulo),
        accion: accion.trim(),
        descripcion: this.limpiarTextoOpcional(descripcion),
      })
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: () => {
          this.mensaje.set('Permiso creado correctamente.');
          this.permisoForm.reset();
          this.permisoFormAbierto.set(false);
          this.cargarPermisos();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected cambiarEstadoPermiso(permiso: PermisoResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = permiso.activo
      ? this.rolPermisoService.desactivarPermiso(permiso.id)
      : this.rolPermisoService.activarPermiso(permiso.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarPermisos();
        this.cargarRoles();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected permisoEstaSeleccionado(permisoId: number): boolean {
    return this.permisosSeleccionados().includes(permisoId);
  }

  protected alternarPermiso(permisoId: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    this.permisosSeleccionados.update((ids) => {
      const setIds = new Set(ids);

      if (input.checked) {
        setIds.add(permisoId);
      } else {
        setIds.delete(permisoId);
      }

      return Array.from(setIds).sort((a, b) => a - b);
    });
  }

  protected moduloCompleto(grupo: ModuloPermisos): boolean {
    return grupo.total > 0 && grupo.seleccionados === grupo.total;
  }

  protected alternarModulo(grupo: ModuloPermisos, event: Event): void {
    const input = event.target as HTMLInputElement;
    const permisoIds = grupo.permisos.map((permiso) => permiso.id);

    this.permisosSeleccionados.update((ids) => {
      const setIds = new Set(ids);

      for (const permisoId of permisoIds) {
        if (input.checked) {
          setIds.add(permisoId);
        } else {
          setIds.delete(permisoId);
        }
      }

      return Array.from(setIds).sort((a, b) => a - b);
    });
  }

  protected guardarPermisosRol(): void {
    const rol = this.rolPermisosEditando();

    if (rol === null) {
      this.error.set('Selecciona un rol para editar permisos.');
      return;
    }

    this.limpiarMensajes();
    this.procesando.set(true);

    this.rolPermisoService
      .actualizarPermisosRol(rol.id, {
        permiso_ids: this.permisosSeleccionados(),
      })
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (response) => {
          this.mensaje.set('Permisos del rol actualizados correctamente.');
          this.permisosSeleccionados.set(response.permiso_ids);
          this.actualizarRolEnLista(response.rol);
          this.rolPermisosEditando.set(response.rol);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected obtenerCodigoPermiso(permiso: PermisoResponse): string {
    return permiso.accion;
  }

  private construirGrupoPermisos(
    codigo: string,
    label: string,
    permisos: PermisoResponse[],
    seleccionados: Set<number>
  ): ModuloPermisos {
    const permisosOrdenados = [...permisos].sort((a, b) =>
      a.accion.localeCompare(b.accion)
    );

    return {
      codigo,
      label,
      permisos: permisosOrdenados,
      seleccionados: permisosOrdenados.filter((permiso) =>
        seleccionados.has(permiso.id)
      ).length,
      activos: permisosOrdenados.filter((permiso) => permiso.activo).length,
      inactivos: permisosOrdenados.filter((permiso) => !permiso.activo).length,
      total: permisosOrdenados.length,
    };
  }

  private agruparPermisos(
    permisos: PermisoResponse[],
    seleccionados: Set<number>
  ): ModuloPermisos[] {
    const permisosPorCodigo = new Map<string, PermisoResponse[]>();

    for (const permiso of permisos) {
      const modulo = this.normalizarModulo(permiso.modulo);
      const permisosModulo = permisosPorCodigo.get(modulo) ?? [];
      permisosModulo.push(permiso);
      permisosPorCodigo.set(modulo, permisosModulo);
    }

    const grupos = MODULOS_ORDENADOS.map(({ codigo, label }) => {
      const permisosModulo = permisosPorCodigo.get(codigo) ?? [];
      return this.construirGrupoPermisos(
        codigo,
        label,
        permisosModulo,
        seleccionados
      );
    }).filter((grupo) => grupo.total > 0);

    const modulosConocidos = new Set(
      MODULOS_ORDENADOS.map((modulo) => modulo.codigo)
    );
    const gruposExtra = Array.from(permisosPorCodigo.entries())
      .filter(([codigo]) => !modulosConocidos.has(codigo))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, permisosModulo]) =>
        this.construirGrupoPermisos(
          codigo,
          this.obtenerLabelModulo(codigo),
          permisosModulo,
          seleccionados
        )
      );

    return [...grupos, ...gruposExtra];
  }

  private cargarRoles(): void {
    this.rolPermisoService.listarRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarPermisos(): void {
    this.rolPermisoService.listarPermisos().subscribe({
      next: (permisos) => {
        this.permisos.set(permisos);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private actualizarRolEnLista(rolActualizado: RolResponse): void {
    this.roles.update((roles) =>
      roles.map((rol) => (rol.id === rolActualizado.id ? rolActualizado : rol))
    );
  }

  private normalizarModulo(modulo: string): string {
    return modulo.trim().toUpperCase().replaceAll(' ', '_');
  }

  private obtenerLabelModulo(codigo: string): string {
    const modulo = MODULOS_ORDENADOS.find((item) => item.codigo === codigo);

    if (modulo) {
      return modulo.label;
    }

    return codigo
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^\w/, (letra) => letra.toUpperCase());
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
