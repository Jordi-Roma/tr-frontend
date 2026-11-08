import { Service } from '@angular/core';
import { ColaOffline, CuentaOffline, Sobre } from './offline.model';

type Almacen = 'cuentas' | 'accesos' | 'descargas' | 'cola';

function respuesta<T>(solicitud: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

@Service()
export class OfflineDb {
  private apertura?: Promise<IDBDatabase>;

  private conectar(): Promise<IDBDatabase> {
    return (this.apertura ??= this.abrir().catch((error: unknown) => {
      this.apertura = undefined;
      throw error;
    }));
  }

  private async abrir(): Promise<IDBDatabase> {
    const solicitud = indexedDB.open('stylear-pwa', 1);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      db.createObjectStore('cuentas', { keyPath: 'ambito' });
      db.createObjectStore('accesos');
      db.createObjectStore('descargas');
      const cola = db.createObjectStore('cola', { keyPath: ['ambito', 'uuid'] });
      cola.createIndex('ambito', 'ambito');
    };
    const db = await respuesta(solicitud);
    db.onversionchange = () => {
      db.close();
      this.apertura = undefined;
    };
    return db;
  }

  private async transaccion<T>(
    nombre: Almacen,
    modo: IDBTransactionMode,
    operacion: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const txn = (await this.conectar()).transaction(nombre, modo);
    const completa = new Promise<void>((resolver, rechazar) => {
      txn.oncomplete = () => resolver();
      txn.onabort = () =>
        rechazar(txn.error ?? new Error('El navegador canceló el guardado local.'));
    });
    const [valor] = await Promise.all([operacion(txn.objectStore(nombre)), completa]);
    return valor;
  }

  cuenta(ambito: string): Promise<CuentaOffline | undefined> {
    return this.transaccion('cuentas', 'readonly', (store) => respuesta(store.get(ambito)));
  }

  agregarCuenta(cuenta: CuentaOffline): Promise<IDBValidKey> {
    return this.transaccion('cuentas', 'readwrite', (store) => respuesta(store.add(cuenta)));
  }

  leer(nombre: 'accesos' | 'descargas', ambito: string): Promise<Sobre | undefined> {
    return this.transaccion(nombre, 'readonly', (store) => respuesta(store.get(ambito)));
  }

  guardar(nombre: 'accesos' | 'descargas', ambito: string, datos: Sobre): Promise<IDBValidKey> {
    return this.transaccion(nombre, 'readwrite', (store) => respuesta(store.put(datos, ambito)));
  }

  cola(ambito: string): Promise<ColaOffline[]> {
    return this.transaccion('cola', 'readonly', (store) =>
      respuesta(store.index('ambito').getAll(ambito)),
    );
  }

  async encolar(fila: ColaOffline): Promise<void> {
    await this.transaccion('cola', 'readwrite', async (store) => {
      if (!(await respuesta(store.getKey([fila.ambito, fila.uuid]))))
        await respuesta(store.add(fila));
    });
  }

  reclamar(
    ambito: string,
    uuid: string,
    id: string,
    manual: boolean,
  ): Promise<ColaOffline | undefined> {
    return this.transaccion('cola', 'readwrite', async (store) => {
      const fila: ColaOffline | undefined = await respuesta(store.get([ambito, uuid]));
      const ahora = Date.now();
      if (
        !fila ||
        (fila.reclamo && fila.reclamo.vence > ahora) ||
        (!manual && fila.siguiente > ahora)
      ) {
        return undefined;
      }
      const reclamada = {
        ...fila,
        intentos: fila.intentos + 1,
        reclamo: { id, vence: ahora + 60_000 },
      };
      await respuesta(store.put(reclamada));
      return reclamada;
    });
  }

  async resultado(fila: ColaOffline, contenido: Sobre, siguiente = 0): Promise<void> {
    await this.transaccion('cola', 'readwrite', async (store) => {
      const actual: ColaOffline | undefined = await respuesta(store.get([fila.ambito, fila.uuid]));
      if (!actual || actual.reclamo?.id !== fila.reclamo?.id) return;
      await respuesta(store.put({ ...actual, contenido, siguiente, reclamo: undefined }));
    });
  }
}
