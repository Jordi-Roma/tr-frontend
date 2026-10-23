"""Starts the API on an explicitly supplied disposable localhost test database.

Never reads a production destination from .env. The frontend tests rewrite only
the API port to 58127; their payloads are served by the real FastAPI backend.
"""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from uuid import uuid4

import psycopg2
from psycopg2.extensions import parse_dsn

dsn = os.environ.get('STYLEAR_TEST_DATABASE_URL', '')
param = parse_dsn(dsn)
assert param.get('host') == '127.0.0.1' and param.get('dbname', '').startswith('stylear_test_')
assert dsn == os.environ.get('DATABASE_URL')
backend = Path(__file__).resolve().parents[2] / 'tr-backend'
sys.path.insert(0, str(backend))
os.chdir(backend)
spec = importlib.util.spec_from_file_location('fixture_helpers', backend / 'tests/test_multitenant_integration.py')
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
actor = helpers.actor.__wrapped__()
a, b, plan, _ = helpers.empresas.__wrapped__(actor)
for empresa, nombre in ((a, 'Atelier Norte'), (b, 'Casa Oliva')):
    helpers.consulta('UPDATE empresa SET nombre=%s WHERE id=%s', (nombre, empresa['id']))
    empresa['nombre'] = nombre
sa, pa, va = helpers.mercaderia(a)
sb, pb, vb = helpers.mercaderia(b)
helpers.consulta("UPDATE producto SET nombre='Prenda Empresa A' WHERE id=%s", (pa,))
helpers.consulta("UPDATE producto SET nombre='Prenda Empresa B' WHERE id=%s", (pb,))
ca = helpers.cliente(a)
cb = helpers.cliente(b)

def personal(rol):
    nombre = rol.lower() + uuid4().hex[:8]
    rid = helpers.consulta('SELECT id FROM rol WHERE nombre=%s', (rol,), True)['id']
    usuario = helpers.crear_usuario_con_rol('Personal', 'Prueba', nombre, nombre+'@example.invalid', helpers.hashear_password('Prueba-aislada-123'), rid, rol, None, a['admin_usuario_id'], a['id'])
    if rol in {'CAJERO', 'ENCARGADO_SUCURSAL'}:
        helpers.consulta("INSERT INTO empleado(usuario_id,sucursal_id,codigo_empleado,cargo,empresa_id) VALUES(%s,%s,%s,'Prueba',%s)", (usuario['id'],sa,nombre,a['id']))
    else:
        pid = helpers.consulta("INSERT INTO proveedor(nombre,empresa_id) VALUES('Proveedor A',%s) RETURNING id",(a['id'],),True)['id']
        helpers.consulta('INSERT INTO proveedor_usuario(proveedor_id,usuario_id,empresa_id) VALUES(%s,%s,%s)',(pid,usuario['id'],a['id']))
    return nombre

datos = {'a': a, 'b': b, 'clienteA': ca[2], 'clienteB': cb[2], 'cajero': personal('CAJERO'), 'encargado': personal('ENCARGADO_SUCURSAL'), 'proveedor': personal('PROVEEDOR'), 'productoA': pa, 'productoB': pb, 'varianteA': va, 'sucursalA': sa, 'plan': plan['id'], 'as': helpers.consulta('SELECT username FROM usuario WHERE id=%s',(actor,),True)['username']}
Path(__file__).with_name('.fixture.json').write_text(json.dumps(datos),encoding='utf-8')

from cryptography.fernet import Fernet
import uvicorn
with tempfile.TemporaryDirectory(prefix='stylear_frontend_e2e_') as privado:
    os.environ['STYLEAR_BACKUP_DIR'] = str(Path(privado)/'copias')
    os.environ['STYLEAR_BACKUP_KEY'] = Fernet.generate_key().decode()
    os.environ['STYLEAR_BACKUP_RETENTION_DAYS'] = '7'
    os.environ.pop('STYLEAR_RESTORE_DATABASE_URL', None)
    os.environ.pop('STYLEAR_RESTORE_ASSETS_DIR', None)
    os.environ['STRIPE_SECRET_KEY'] = 'MODO_PRUEBA'
    from app.modules.administracion.services import respaldo_service
    respaldo_service.STATIC = Path(privado)/'static'
    uvicorn.run('app.main:app',host='127.0.0.1',port=58127,log_level='warning')
