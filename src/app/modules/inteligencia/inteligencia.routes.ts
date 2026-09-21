import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { AdminDashboardPage } from './pages/admin-dashboard/admin-dashboard.page';
import { ParaTiPage } from './pages/para-ti/para-ti.page';
import { ReportesPage } from './pages/reportes/reportes.page';

export const INTELIGENCIA_ROUTES: Routes = [
  {
    path: 'dashboard',
    component: AdminDashboardPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR'],
    },
  },
  {
    path: 'para-ti',
    component: ParaTiPage,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'reportes',
    component: ReportesPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR'],
    },
  },
];
