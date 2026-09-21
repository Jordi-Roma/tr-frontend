import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { CatalogoPage } from './pages/catalogo/catalogo.page';
import { FavoritosPage } from './pages/favoritos/favoritos.page';
import { InicioPage } from './pages/inicio/inicio.page';
import { ProductoDetallePage } from './pages/producto-detalle/producto-detalle.page';

export const CATALOGO_ROUTES: Routes = [
  {
    path: 'inicio',
    component: InicioPage,
  },
  {
    path: 'catalogo',
    component: CatalogoPage,
  },
  {
    path: 'poleras',
    component: CatalogoPage,
    data: {
      categoria: 'poleras',
    },
  },
  {
    path: 'oversize',
    component: CatalogoPage,
    data: {
      categoria: 'oversize',
    },
  },
  {
    path: 'camisas',
    component: CatalogoPage,
    data: {
      categoria: 'camisas',
    },
  },
  {
    path: 'favoritos',
    component: FavoritosPage,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'producto/:id',
    component: ProductoDetallePage,
  },
];
