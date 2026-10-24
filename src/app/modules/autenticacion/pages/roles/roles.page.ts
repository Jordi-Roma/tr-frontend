import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';
import { mensajeApi } from '../../../../core/services/error-api';
import { AuthService } from '../../services/auth.service';
import { AccesoAdminService, CatalogoAcceso, RolAcceso } from '../../services/acceso-admin.service';

@Component({
  selector: 'app-roles-page',
  imports: [ReactiveFormsModule, AppDrawerComponent],
  templateUrl: './roles.page.html',
  styleUrl: '../acceso-admin.css',
})
export class RolesPage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AccesoAdminService);
  protected readonly plataforma = this.auth.tieneRol('ADMIN_SAAS');
  protected readonly estado = new FormControl('ACTIVOS', { nonNullable: true });
  protected readonly datos = signal<CatalogoAcceso>({ roles: [], permisos: [] });
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly rol = signal<RolAcceso | null>(null);
  protected readonly descripcion = new FormControl('', { nonNullable: true });
  protected readonly confirmar = new FormControl(false, { nonNullable: true });
  protected readonly seleccionados = signal<number[]>([]);
  protected readonly modulos = computed(() =>
    Array.from(new Set(this.datos().permisos.map((p) => p.modulo))),
  );
  constructor() {
    this.cargar();
  }
  protected cargar() {
    this.error.set('');
    this.cargando.set(true);
    this.api
      .catalogos(this.estado.value)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (c) => this.datos.set(c), error: (e) => this.error.set(mensajeApi(e)) });
  }
  protected abrir(r: RolAcceso) {
    this.rol.set(r);
    this.seleccionados.set([...r.permiso_ids]);
    this.descripcion.setValue(r.descripcion ?? '');
    this.confirmar.setValue(false);
    this.error.set('');
    this.mensaje.set('');
  }
  protected cerrar() {
    if (!this.guardando()) {
      this.rol.set(null);
      this.error.set('');
    }
  }
  protected marcar(id: number, event: Event) {
    const activo = (event.target as HTMLInputElement).checked;
    this.seleccionados.update((ids) => (activo ? [...ids, id] : ids.filter((i) => i !== id)));
  }
  protected guardarPermisos() {
    const r = this.rol();
    if (!r || !this.confirmar.value || this.guardando()) return;
    this.guardar({ permiso_ids: this.seleccionados(), confirmar_global: true });
  }
  protected guardarDescripcion() {
    this.guardar({ descripcion: this.descripcion.value });
  }
  protected cambiarEstado() {
    const r = this.rol();
    if (r && !r.protegido && this.confirmar.value)
      this.guardar({ activo: !r.activo, confirmar_global: true });
  }
  private guardar(datos: {
    descripcion?: string;
    activo?: boolean;
    permiso_ids?: number[];
    confirmar_global?: boolean;
  }) {
    const r = this.rol();
    if (!r || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .plantilla(r.id, datos)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (res) => {
          this.rol.set(null);
          this.mensaje.set(res.mensaje);
          this.cargar();
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
}
