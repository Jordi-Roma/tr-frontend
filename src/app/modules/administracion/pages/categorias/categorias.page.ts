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
import { CategoriaResponse } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';

export interface TreeCategory extends CategoriaResponse {
  nivel: number;
  expandido: boolean;
  tieneHijos: boolean;
  oculto: boolean;
}

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-categorias-page',
  styleUrl: './categorias.page.css',
  templateUrl: './categorias.page.html',
})
export class CategoriasPage {
  private readonly catalogoService = inject(CatalogoService);

  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly categoriaEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');
  protected readonly expandidos = signal<Set<number>>(new Set());

  protected readonly categoriasPadreDisponibles = computed(() => {
    const editandoId = this.categoriaEditandoId();
    return this.categorias().filter(c => c.activo && c.id !== editandoId);
  });

  protected readonly categoriasFiltradasTree = computed(() => {
    const categorias = this.categorias();
    const busqueda = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    const map = new Map<number | null, CategoriaResponse[]>();
    categorias.forEach(c => {
      const pid = c.categoria_padre_id;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(c);
    });

    const expandidos = this.expandidos();
    const tree: TreeCategory[] = [];

    const buildTree = (parentId: number | null, nivel: number, oculto: boolean) => {
      const children = map.get(parentId) || [];
      for (const c of children) {
        const tieneHijos = (map.get(c.id)?.length ?? 0) > 0;
        const expandido = expandidos.has(c.id);
        
        tree.push({
          ...c,
          nivel,
          expandido,
          tieneHijos,
          oculto
        });

        if (tieneHijos) {
          buildTree(c.id, nivel + 1, oculto || !expandido);
        }
      }
    };

    buildTree(null, 0, false);

    if (busqueda !== '' || estado !== 'todos') {
      return tree.filter(c => {
        const coincideBusqueda =
          busqueda === '' ||
          [c.nombre, c.descripcion ?? ''].join(' ').toLowerCase().includes(busqueda);
        const coincideEstado =
          estado === 'todos' ||
          (estado === 'activos' && c.activo) ||
          (estado === 'inactivos' && !c.activo);
        return coincideBusqueda && coincideEstado;
      });
    }

    return tree.filter(c => !c.oculto);
  });

  protected readonly categoriaForm = new FormGroup({
    categoria_padre_id: new FormControl<number | null>(null),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    descripcion: new FormControl<string | null>(null),
  });

  constructor() {
    this.cargarCategorias();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected actualizarFiltroEstado(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroEstado.set(select.value as 'todos' | 'activos' | 'inactivos');
  }

  protected seleccionarCategoria(categoria: CategoriaResponse): void {
    this.categoriaEditandoId.set(categoria.id);
    this.categoriaForm.setValue({
      categoria_padre_id: categoria.categoria_padre_id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
    });
    this.formularioAbierto.set(true);
    this.limpiarMensajes();
  }

  protected abrirNuevaCategoria(): void {
    this.cancelarEdicion();
    this.limpiarMensajes();
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(false);
  }

  protected alternarExpansion(categoriaId: number): void {
    this.expandidos.update(set => {
      const newSet = new Set(set);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  }

  protected cancelarEdicion(): void {
    this.categoriaEditandoId.set(null);
    this.categoriaForm.reset();
  }

  protected guardarCategoria(): void {
    this.limpiarMensajes();

    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }

    const { categoria_padre_id, nombre, descripcion } = this.categoriaForm.getRawValue();
    this.procesando.set(true);
    const categoriaId = this.categoriaEditandoId();

    const operacion =
      categoriaId === null
        ? this.catalogoService.crearCategoria({
            categoria_padre_id,
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
          })
        : this.catalogoService.actualizarCategoria(categoriaId, {
            categoria_padre_id,
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
          });

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          categoriaId === null
            ? 'Categoría creada correctamente.'
            : 'Categoría actualizada correctamente.'
        );
        this.cancelarEdicion();
        this.formularioAbierto.set(false);
        this.cargarCategorias();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoCategoria(categoria: CategoriaResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const esActivo = categoria.activo;

    const operacion$: Observable<unknown> = esActivo
      ? this.catalogoService.desactivarCategoria(categoria.id)
      : this.catalogoService.activarCategoria(categoria.id);

    operacion$.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          esActivo
            ? 'Categoría desactivada correctamente.'
            : 'Categoría activada correctamente.'
        );
        this.cargarCategorias();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarCategorias(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogoService
      .listarCategorias()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (categorias) => {
          this.categorias.set(categorias);
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
