"""
Pruebas del flujo completo de interconsultas (Sprint 3) contra una base SQLite
en memoria. Se llama directamente a las funciones de los endpoints, pasando el
usuario ya autenticado, así que no se necesita MySQL ni levantar el servidor.

    python -m pytest DATA/tests      (o)   python -m unittest discover -s DATA/tests -t .
"""
import logging
import os
import sqlite3
import unittest
from datetime import date, datetime
from unittest import mock

os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET") or "secreto-de-pruebas"  # vacío cuenta como ausente
os.environ["SMTP_HOST"] = ""            # los correos quedan "simulados" en la bitácora

from fastapi import HTTPException  # noqa: E402

from DATA import main, servicios as srv  # noqa: E402

logging.getLogger("api-lista-espera").setLevel(logging.ERROR)  # menos ruido en la salida
sqlite3.register_adapter(date, lambda d: d.isoformat())
sqlite3.register_adapter(datetime, lambda d: d.isoformat(" "))

ESQUEMA = """
CREATE TABLE especialidad (idEspecialidad INTEGER PRIMARY KEY, nombreEspecialidad TEXT);
CREATE TABLE estados (idEstado INTEGER PRIMARY KEY, nombreEstado TEXT);
CREATE TABLE persona (idPersona INTEGER PRIMARY KEY, nombrePersona TEXT);
CREATE TABLE persona_correos (correos TEXT, idPersona INTEGER);
CREATE TABLE cesfam (idCesfam INTEGER PRIMARY KEY, nombreCesfam TEXT, correo TEXT);
CREATE TABLE hospital (idHospital INTEGER PRIMARY KEY, nombreHospital TEXT);
CREATE TABLE acceso (idPersona INTEGER, idRol INTEGER, Activo TEXT, idCesfam INTEGER, idHospital INTEGER);
CREATE TABLE formulario (
    idFormulario INTEGER PRIMARY KEY AUTOINCREMENT, descripcion TEXT, fechaInicio TEXT,
    idPersona INTEGER, idCesfam INTEGER, idHospital INTEGER, idEstado INTEGER,
    prioridadClinica TEXT, idEspecialidad INTEGER,
    motivoDevolucion TEXT, observacionDevolucion TEXT, fechaDevolucion TEXT,
    alertaRevisada INTEGER NOT NULL DEFAULT 1, causalCierre TEXT, fechaCierre TEXT,
    fechaCita TEXT, centroCita TEXT, uuidLocal TEXT UNIQUE);
CREATE TABLE formulario_historial (
    idHistorial INTEGER PRIMARY KEY AUTOINCREMENT, idFormulario INTEGER, idEstadoAnterior INTEGER,
    idEstadoNuevo INTEGER, idPersona INTEGER, fecha TEXT, comentario TEXT);
CREATE TABLE notificacion_correo (
    idNotificacion INTEGER PRIMARY KEY AUTOINCREMENT, idFormulario INTEGER, tipo TEXT,
    destinatario TEXT, asunto TEXT, cuerpo TEXT, estadoEnvio TEXT, detalle TEXT, fecha TEXT);
"""

# ids de usuarios de prueba
PACIENTE, OTRO_PACIENTE, ADMIN_A, ADMIN_B, ESP_1, ESP_2 = 1, 2, 3, 4, 5, 6


class ConexionFalsa:
    """Imita la interfaz mínima de mysql.connector sobre una conexión SQLite compartida."""

    def __init__(self, raw):
        self.raw = raw

    def cursor(self, dictionary=False):
        return CursorFalso(self.raw)

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        pass  # la base en memoria vive durante todo el test

    def is_connected(self):
        return True


class CursorFalso:
    def __init__(self, raw):
        self.c = raw.cursor()

    def execute(self, sql, params=()):
        self.c.execute(sql.replace("%s", "?"), tuple(params))

    def fetchone(self):
        fila = self.c.fetchone()
        return self._dict(fila)

    def fetchall(self):
        return [self._dict(f) for f in self.c.fetchall()]

    def _dict(self, fila):
        if fila is None:
            return None
        return {d[0]: v for d, v in zip(self.c.description, fila)}

    @property
    def lastrowid(self):
        return self.c.lastrowid

    @property
    def rowcount(self):
        return self.c.rowcount

    def close(self):
        self.c.close()


class BGInmediato:
    """BackgroundTasks de pruebas: ejecuta la tarea en el acto."""

    def add_task(self, fn, *args, **kwargs):
        fn(*args, **kwargs)


def usuario(id_persona, rol):
    return {"sub": str(id_persona), "rol": rol}


class BaseFlujo(unittest.TestCase):
    def setUp(self):
        self.raw = sqlite3.connect(":memory:", check_same_thread=False)
        self.raw.executescript(ESQUEMA)
        r = self.raw
        r.executemany("INSERT INTO estados VALUES (?, ?)", list(srv.NOMBRES_ESTADO.items()))
        r.executemany("INSERT INTO especialidad VALUES (?, ?)", [(1, "Cardiología"), (2, "Oftalmología")])
        r.executemany("INSERT INTO persona VALUES (?, ?)", [
            (PACIENTE, "Ana Paciente"), (OTRO_PACIENTE, "Beto Otro"),
            (ADMIN_A, "Admin CESFAM A"), (ADMIN_B, "Admin CESFAM B"),
            (ESP_1, "Dra. Especialista 1"), (ESP_2, "Dr. Especialista 2")])
        r.executemany("INSERT INTO persona_correos VALUES (?, ?)", [
            ("ana@correo.cl", PACIENTE), ("beto@correo.cl", OTRO_PACIENTE)])
        r.executemany("INSERT INTO cesfam VALUES (?, ?, ?)", [
            (1, "CESFAM A", "cesfam.a@salud.cl"), (2, "CESFAM B", None)])
        r.executemany("INSERT INTO hospital VALUES (?, ?)", [(1, "Hospital Uno"), (2, "Hospital Dos")])
        r.executemany("INSERT INTO acceso VALUES (?, ?, ?, ?, ?)", [
            (ADMIN_A, 1, "S", 1, 0), (ADMIN_B, 1, "S", 2, 0),
            (ESP_1, 2, "S", 0, 1), (ESP_2, 2, "S", 0, 2),
            (PACIENTE, 3, "S", 0, 0)])
        r.commit()

        patcher = mock.patch.object(main, "get_conexion", lambda: ConexionFalsa(self.raw))
        patcher.start()
        self.addCleanup(patcher.stop)

        self.admin = usuario(ADMIN_A, 1)
        self.esp = usuario(ESP_1, 2)

    # ---- ayudas ----
    def crea(self, **extra):
        datos = dict(descripcion="Dolor torácico", fechaInicio=date.today(), idPersona=PACIENTE,
                     idCesfam=1, idHospital=1, idEspecialidad=1, prioridad="alta")
        datos.update(extra)
        res = main.creaFormulario(main.formularioEntrada(**datos), BGInmediato(), self.admin)
        return res["idFormulario"]

    def fila(self, id_formulario):
        c = CursorFalso(self.raw)
        c.execute("SELECT * FROM formulario WHERE idFormulario = %s", (id_formulario,))
        return c.fetchone()

    def correos(self, id_formulario, tipo=None):
        c = CursorFalso(self.raw)
        c.execute("SELECT * FROM notificacion_correo WHERE idFormulario = %s ORDER BY idNotificacion",
                  (id_formulario,))
        return [f for f in c.fetchall() if tipo is None or f["tipo"] == tipo]

    def assertHTTP(self, codigo, fn, *args, **kwargs):
        with self.assertRaises(HTTPException) as ctx:
            fn(*args, **kwargs)
        self.assertEqual(ctx.exception.status_code, codigo, ctx.exception.detail)
        return ctx.exception


class RegistroTest(BaseFlujo):
    def test_registro_crea_estado_registrada_historial_y_correo(self):
        id_f = self.crea()
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_REGISTRADA)
        hist = main.obtieneHistorial(id_f, self.admin)
        self.assertEqual(len(hist), 1)
        self.assertIsNone(hist[0]["estadoAnterior"])
        self.assertEqual(hist[0]["estadoNuevo"], "Registrada")
        self.assertEqual(hist[0]["usuario"], "Admin CESFAM A")
        correos = self.correos(id_f, "paciente")
        self.assertEqual(len(correos), 1)
        self.assertEqual(correos[0]["destinatario"], "ana@correo.cl")
        self.assertEqual(correos[0]["estadoEnvio"], "simulado")


class PrivacidadTest(BaseFlujo):
    def test_paciente_no_ve_interconsultas_ajenas(self):
        id_f = self.crea()
        self.assertHTTP(403, main.obtieneFormulario, id_f, usuario(OTRO_PACIENTE, 3))


class HistorialTest(BaseFlujo):  # HU07
    def test_alcance_por_establecimiento(self):
        id_f = self.crea()
        self.assertHTTP(403, main.obtieneHistorial, id_f, usuario(ESP_2, 2))
        self.assertHTTP(404, main.obtieneHistorial, 999, self.admin)


class NotificacionesTest(BaseFlujo):  # HU15
    def test_sin_correo_registrado_queda_en_bitacora(self):
        self.raw.execute("DELETE FROM persona_correos WHERE idPersona = ?", (PACIENTE,))
        id_f = self.crea()
        self.assertEqual(self.correos(id_f, "paciente")[0]["estadoEnvio"], "sin_destinatario")

    def test_un_fallo_de_smtp_no_rompe_el_flujo(self):
        with mock.patch.object(srv, "enviar_correo", return_value=("error", "SMTP caído")):
            id_f = self.crea()
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_REGISTRADA)
        self.assertEqual(self.correos(id_f, "paciente")[0]["estadoEnvio"], "error")

    def test_bitacora_consultable(self):
        id_f = self.crea()
        self.assertEqual(len(main.obtieneNotificaciones(id_f, self.admin)), 1)


if __name__ == "__main__":
    unittest.main()
