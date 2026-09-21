import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { CarritoPage } from './pages/carrito/carrito.page';
import { ReservaDetallePage } from './pages/reserva-detalle/reserva-detalle.page';
import { ReservasPage } from './pages/reservas/reservas.page';
import { ReservasAdminPage } from './pages/reservas-admin/reservas-admin.page';

export const RESERVAS_ROUTES: Routes = [
  {
    path: 'carrito',
    component: CarritoPage,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'reservas',
    component: ReservasPage,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'reservas/:id',
    component: ReservaDetallePage,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'reservas-admin',
    component: ReservasAdminPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL'],
    },
  },
];
