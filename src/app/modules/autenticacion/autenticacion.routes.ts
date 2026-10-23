import { empresaGuard } from '../../core/guards/empresa.guard';
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { BitacoraPage } from './pages/bitacora/bitacora.page';
import { LoginPage } from './pages/login/login.page';
import { PerfilPage } from './pages/perfil/perfil.page';
import { RecuperarPasswordPage } from './pages/recuperar-password/recuperar-password.page';
import { RegistroPage } from './pages/registro/registro.page';
import { RolesPage } from './pages/roles/roles.page';
import { UsuariosPage } from './pages/usuarios/usuarios.page';

export const AUTENTICACION_PUBLIC_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginPage,
    canActivate: [empresaGuard],
  },
  {
    path: 'registro',
    component: RegistroPage,
    canActivate: [empresaGuard],
  },
  {
    path: 'recuperar-password',
    component: RecuperarPasswordPage,
    canActivate: [empresaGuard],
  },
];

export const AUTENTICACION_ROUTES: Routes = [
  {
    path: 'perfil',
    component: PerfilPage,
    canActivate: [authGuard],
  },
  {
    path: 'usuarios',
    component: UsuariosPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR'],
    },
  },
  {
    path: 'roles',
    component: RolesPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ADMIN_SAAS'],
    },
  },
  {
    path: 'bitacora',
    component: BitacoraPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR'],
    },
  },
];
