import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { ForbiddenPage } from './shared/pages/forbidden/forbidden.page';
import { NotFoundPage } from './shared/pages/not-found/not-found.page';

export const routes: Routes = [
  { path: '403', component: ForbiddenPage },
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },
  {
    path: '',
    loadChildren: () =>
      import('./modules/autenticacion/autenticacion.routes').then(
        (m) => m.AUTENTICACION_PUBLIC_ROUTES
      ),
  },
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/autenticacion/autenticacion.routes').then(
            (m) => m.AUTENTICACION_ROUTES
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/catalogo/catalogo.routes').then((m) => m.CATALOGO_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/reservas/reservas.routes').then((m) => m.RESERVAS_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/inteligencia/inteligencia.routes').then((m) => m.INTELIGENCIA_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/ventas_inventario/ventas-inventario.routes').then((m) => m.VENTAS_INVENTARIO_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./modules/administracion/administracion.routes').then((m) => m.ADMINISTRACION_ROUTES),
      },
    ],
  },
  { path: '**', component: NotFoundPage },
];
