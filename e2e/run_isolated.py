"""Run Playwright specs against separate clones of a migrated local test database."""

import argparse
from contextlib import contextmanager
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.request import urlopen
from uuid import uuid4

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import make_dsn, parse_dsn


ROOT = Path(__file__).resolve().parents[1]
MODES = {
    'cu17-mayorista': ('MAYORISTA',),
    'cu18-delivery': ('RUTAS',),
    'cu19-cambios': ('CAMBIOS',),
    'cu22-reportes': ('REPORTES',),
    'cu23-cu24': ('INTELIGENCIA',),
    'cu25-respaldos': ('RESPALDOS',),
    'cu27-notificaciones': ('INTELIGENCIA', 'NOTIFICACIONES'),
    'multitenant': ('RESPALDOS',),
}


@contextmanager
def proceso(comando, entorno):
    with subprocess.Popen(comando, cwd=ROOT, env=entorno) as proceso:
        try:
            yield proceso
        finally:
            if proceso.poll() is None:
                proceso.terminate()
                proceso.wait(timeout=20)


def esperar(url, servidor):
    limite = time.monotonic() + 120
    while servidor.poll() is None and time.monotonic() < limite:
        try:
            with urlopen(url, timeout=2) as respuesta:
                if respuesta.status == 200:
                    return
        except OSError:
            time.sleep(1)
    raise RuntimeError(f'El servidor de pruebas no respondió en {url}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('specs', nargs='*', help='Nombres de archivo .spec.ts dentro de e2e')
    args = parser.parse_args()
    disponibles = {p.name: p for p in (ROOT / 'e2e').glob('*.spec.ts')}
    specs = args.specs or sorted(disponibles)
    if any(spec not in disponibles for spec in specs):
        parser.error('Cada archivo debe existir en e2e')
    dsn = os.environ.get('STYLEAR_E2E_TEMPLATE_DATABASE_URL', '')
    destino = parse_dsn(dsn)
    plantilla = destino.get('dbname', '')
    if destino.get('host') != '127.0.0.1' or not plantilla.startswith('stylear_test_'):
        parser.error('Indica una plantilla migrada stylear_test_* en 127.0.0.1')
    for puerto in (48123, 18127):
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', puerto)) == 0:
                parser.error(f'El puerto local {puerto} debe estar libre')

    entorno = {
        **os.environ,
        'STYLEAR_E2E_REUSE_WEB': '1',
        'STYLEAR_FIREBASE_CREDENTIALS': '',
        'R2_ENDPOINT_URL': 'https://invalid.test',
    }
    originales = {
        p: p.read_bytes() if p.exists() else None
        for p in (ROOT / 'e2e' / n for n in ('.fixture.json', '.correos.json'))
    }
    admin = psycopg2.connect(make_dsn(dsn, dbname='postgres'))
    admin.autocommit = True
    fallidos = []
    try:
        with proceso(['node', 'node_modules/@angular/cli/bin/ng.js', 'serve',
                      '--host', '127.0.0.1', '--port', '48123'], entorno) as web:
            esperar('http://127.0.0.1:48123', web)
            for spec in specs:
                nombre = spec.removesuffix('.spec.ts')
                modos = MODES.get(nombre, ())
                base = 'stylear_test_web_' + uuid4().hex
                ensayo = base + '_ensayo'
                creadas = []
                try:
                    with admin.cursor() as cur:
                        cur.execute(sql.SQL('CREATE DATABASE {} TEMPLATE {}').format(
                            sql.Identifier(base), sql.Identifier(plantilla)))
                        creadas.append(base)
                        if 'RESPALDOS' in modos:
                            cur.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(ensayo)))
                            creadas.append(ensayo)
                    url = make_dsn(dsn, dbname=base)
                    entorno_spec = {
                        **entorno,
                        'DATABASE_URL': url,
                        'STYLEAR_TEST_DATABASE_URL': url,
                        'STYLEAR_E2E_RESTORE_DATABASE_URL': make_dsn(dsn, dbname=ensayo),
                        **{f'STYLEAR_E2E_{modo}': str(int(modo in modos))
                           for grupo in MODES.values() for modo in grupo},
                    }
                    print(f'\n--- {spec} ---', flush=True)
                    with proceso([sys.executable, 'e2e/backend_fixture.py'], entorno_spec) as api:
                        esperar('http://127.0.0.1:18127/openapi.json', api)
                        resultado = subprocess.run([
                            'node', 'node_modules/@playwright/test/cli.js', 'test',
                            f'e2e/{spec}', '--reporter=dot', f'--output=test-results/{nombre}',
                        ], cwd=ROOT, env=entorno_spec, check=False)
                        if resultado.returncode:
                            fallidos.append(spec)
                finally:
                    with admin.cursor() as cur:
                        for creada in reversed(creadas):
                            cur.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(
                                sql.Identifier(creada)))
    finally:
        admin.close()
        for ruta, contenido in originales.items():
            if contenido is None:
                ruta.unlink(missing_ok=True)
            else:
                ruta.write_bytes(contenido)
    print(f'{len(specs) - len(fallidos)}/{len(specs)} archivos aprobados.', flush=True)
    if fallidos:
        print('Archivos con fallos: ' + ', '.join(fallidos), flush=True)
    return bool(fallidos)


if __name__ == '__main__':
    sys.exit(main())
