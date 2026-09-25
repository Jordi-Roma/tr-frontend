import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { DetallePagoPage } from './pages/detalle-pago/detalle-pago.page';
import { DevolucionesPage } from './pages/historial-pagos/devoluciones.page';
import { DetalleDeliveryPage } from './pages/detalle-delivery/detalle-delivery.page';
import { HistorialDeliveryPage } from './pages/historial-delivery/historial-delivery.page';
import { HistorialPagosPage } from './pages/historial-pagos/historial-pagos.page';
import { InventarioPage } from './pages/inventario/inventario.page';
import { MovimientosInventarioPage } from './pages/movimientos-inventario/movimientos-inventario.page';
import { PagoResultadoPage } from './pages/pago-resultado/pago-resultado.page';
import { TransferenciasStockPage } from './pages/transferencias-stock/transferencias-stock.page';
import { VentaPresencialPage } from './pages/venta-presencial/venta-presencial.page';

export const VENTAS_INVENTARIO_ROUTES: Routes = [
  {
    path: 'devoluciones',
    component: DevolucionesPage,
    canActivate: [roleGuard],
    data: { roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'] },
  },
  {
    path: 'mis-devoluciones',
    component: DevolucionesPage,
    canActivate: [roleGuard],
    data: { roles: ['CLIENTE'], vista: 'cliente' },
  },
  {
    path: 'inventario',
    component: InventarioPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'],
    },
  },
  {
    path: 'movimientos-inventario',
    component: MovimientosInventarioPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL'],
    },
  },
  {
    path: 'transferencias-stock',
    component: TransferenciasStockPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL'],
    },
  },
  {
    path: 'venta-presencial',
    component: VentaPresencialPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'],
    },
  },
  {
    path: 'pagos',
    component: HistorialPagosPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL'],
    },
  },
  {
    path: 'pagos/:id',
    component: DetallePagoPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL'],
    },
  },
  {
    path: 'delivery',
    component: HistorialDeliveryPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'],
    },
  },
  {
    path: 'delivery/:id',
    component: DetalleDeliveryPage,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMINISTRADOR', 'ENCARGADO_SUCURSAL', 'CAJERO'],
    },
  },
  {
    path: 'mis-pagos',
    component: HistorialPagosPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'mis-deliveries',
    component: HistorialDeliveryPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'mis-deliveries/:id',
    component: DetalleDeliveryPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'mis-pagos/:id',
    component: DetallePagoPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE'],
    },
  },
  {
    path: 'pago/resultado',
    component: PagoResultadoPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE', 'ADMINISTRADOR'],
    },
  },
  {
    path: 'pago/cancelado',
    component: PagoResultadoPage,
    canActivate: [roleGuard],
    data: {
      roles: ['CLIENTE', 'ADMINISTRADOR'],
    },
  },
];
