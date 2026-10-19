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

    def revisa(self, id_f, accion, motivo=None, observaciones=None, user=None):
        return main.revisaInterconsulta(
            id_f, main.RevisionEspecialista(accion=accion, motivo=motivo, observaciones=observaciones),
            BGInmediato(), user or self.esp)

    def devuelve(self, id_f, motivo="Falta examen de laboratorio", observaciones="Adjuntar hemograma"):
        return self.revisa(id_f, "devolver", motivo, observaciones)

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


class RevisionEspecialistaTest(BaseFlujo):  # HU23
    def test_bandeja_muestra_solo_pendientes_de_su_hospital_ordenadas_por_prioridad(self):
        baja = self.crea(prioridad="baja")
        alta = self.crea(prioridad="alta")
        self.crea(idHospital=2)  # otro hospital
        bandeja = main.bandejaEspecialista(self.esp)
        self.assertEqual([b["idFormulario"] for b in bandeja], [alta, baja])
        self.assertTrue(all(b["idHospital"] == 1 for b in bandeja))
        self.assertEqual(main.bandejaEspecialista(usuario(ESP_2, 2))[0]["idHospital"], 2)

    def test_aceptar_cambia_estado_notifica_cesfam_y_paciente(self):
        id_f = self.crea()
        res = self.revisa(id_f, "aceptar")
        self.assertEqual(res["idEstado"], srv.E_LISTA_ESPERA)
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_LISTA_ESPERA)
        self.assertEqual(main.bandejaEspecialista(self.esp), [])  # sale de la bandeja
        cesfam = self.correos(id_f, "cesfam")
        self.assertEqual(len(cesfam), 1)
        self.assertEqual(cesfam[0]["destinatario"], "cesfam.a@salud.cl")
        self.assertIn("ACEPTADA", cesfam[0]["asunto"])
        self.assertEqual(len(self.correos(id_f, "paciente")), 2)  # alta + aceptación

    def test_devolver_exige_motivo(self):
        id_f = self.crea()
        for vacio in (None, "", "   "):
            self.assertHTTP(400, self.revisa, id_f, "devolver", vacio)
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_REGISTRADA)

    def test_devolver_guarda_motivo(self):
        id_f = self.crea()
        self.devuelve(id_f)
        f = self.fila(id_f)
        self.assertEqual(f["idEstado"], srv.E_DEVUELTA)
        self.assertEqual(f["motivoDevolucion"], "Falta examen de laboratorio")
        self.assertIn("DEVUELTA", self.correos(id_f, "cesfam")[0]["asunto"])

    def test_correos_no_incluyen_el_motivo_clinico(self):
        id_f = self.crea()
        self.devuelve(id_f, motivo="Sospecha de infarto previo")
        for c in self.correos(id_f):
            self.assertNotIn("infarto", c["cuerpo"].lower())

    def test_no_puede_revisar_otro_hospital(self):
        id_f = self.crea()
        self.assertHTTP(403, self.revisa, id_f, "aceptar", None, None, usuario(ESP_2, 2))

    def test_no_se_puede_revisar_dos_veces(self):
        id_f = self.crea()
        self.revisa(id_f, "aceptar")
        self.assertHTTP(409, self.revisa, id_f, "aceptar")
        self.assertHTTP(409, self.revisa, id_f, "devolver", "otro motivo")

    def test_accion_invalida_es_rechazada_por_el_modelo(self):
        with self.assertRaises(Exception):
            main.RevisionEspecialista(accion="borrar")


class DevolucionTest(BaseFlujo):  # HU05A
    def test_consulta_motivo_y_observaciones(self):
        id_f = self.crea()
        self.devuelve(id_f, "Falta examen", "Adjuntar hemograma")
        d = main.obtieneDevolucion(id_f, self.admin)
        self.assertEqual(d["motivo"], "Falta examen")
        self.assertEqual(d["observaciones"], "Adjuntar hemograma")
        self.assertEqual(d["hospital"], "Hospital Uno")
        self.assertTrue(d["fecha"].endswith("Z"))

    def test_solo_aplica_a_interconsultas_devueltas(self):
        id_f = self.crea()
        self.assertHTTP(409, main.obtieneDevolucion, id_f, self.admin)

    def test_otro_cesfam_no_puede_consultarla(self):
        id_f = self.crea()
        self.devuelve(id_f)
        self.assertHTTP(403, main.obtieneDevolucion, id_f, usuario(ADMIN_B, 1))

    def test_el_paciente_no_ve_el_motivo_en_el_detalle(self):
        id_f = self.crea()
        self.devuelve(id_f)
        vista = main.obtieneFormulario(id_f, usuario(PACIENTE, 3))
        self.assertIsNone(vista["motivoDevolucion"])
        self.assertEqual(main.obtieneFormulario(id_f, self.admin)["motivoDevolucion"],
                         "Falta examen de laboratorio")

    def test_paciente_no_ve_interconsultas_ajenas(self):
        id_f = self.crea()
        self.assertHTTP(403, main.obtieneFormulario, id_f, usuario(OTRO_PACIENTE, 3))


class EdicionAdministrativaTest(BaseFlujo):  # HU03
    def test_solo_campos_administrativos(self):
        for prohibido in ("idPersona", "idCesfam", "fechaInicio", "idEstado"):
            with self.assertRaises(Exception, msg=prohibido):
                main.EdicionAdministrativa(**{prohibido: 1})

    def test_actualiza_y_devuelve_datos_nuevos(self):
        id_f = self.crea()
        res = main.modificaDatosAdministrativos(
            id_f, main.EdicionAdministrativa(descripcion="  Control anual  ", prioridad="baja",
                                             idEspecialidad=2), self.admin)
        self.assertEqual(res["descripcion"], "Control anual")
        self.assertEqual(res["prioridadClinica"], "baja")
        self.assertEqual(res["nombreEspecialidad"], "Oftalmología")
        f = self.fila(id_f)
        self.assertEqual((f["descripcion"], f["prioridadClinica"], f["idEspecialidad"]), ("Control anual", "3", 2))
        self.assertEqual(f["idPersona"], PACIENTE)       # intactos
        self.assertEqual(f["idEstado"], srv.E_REGISTRADA)

    def test_sin_campos_es_400(self):
        id_f = self.crea()
        self.assertHTTP(400, main.modificaDatosAdministrativos, id_f, main.EdicionAdministrativa(), self.admin)

    def test_validaciones(self):
        id_f = self.crea()
        with self.assertRaises(Exception):
            main.EdicionAdministrativa(descripcion="   ")
        self.assertHTTP(400, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(prioridad="urgentisima"), self.admin)
        self.assertHTTP(422, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(idEspecialidad=99), self.admin)
        self.assertHTTP(422, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(idHospital=99), self.admin)

    def test_no_edita_finalizadas_ni_otro_cesfam(self):
        id_f = self.crea()
        self.assertHTTP(403, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(descripcion="x"), usuario(ADMIN_B, 1))
        self.raw.execute("UPDATE formulario SET idEstado = ? WHERE idFormulario = ?", (srv.E_FINALIZADA, id_f))
        self.assertHTTP(409, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(descripcion="x"), self.admin)

    def test_hospital_no_cambia_una_vez_aceptada(self):
        id_f = self.crea()
        self.revisa(id_f, "aceptar")
        self.assertHTTP(409, main.modificaDatosAdministrativos, id_f,
                        main.EdicionAdministrativa(idHospital=2), self.admin)
        # pero sí puede ajustar la prioridad
        main.modificaDatosAdministrativos(id_f, main.EdicionAdministrativa(prioridad="media"), self.admin)

    def test_especialista_no_puede_editar_via_endpoint_administrativo(self):
        # la restricción de rol vive en la dependencia declarada (requiere_rol(1))
        verificador = main.modificaDatosAdministrativos.__defaults__[-1].dependency
        token_especialista = "Bearer " + main.crea_token(ESP_1, 2)
        self.assertHTTP(403, verificador, token_especialista)
        self.assertEqual(verificador("Bearer " + main.crea_token(ADMIN_A, 1))["rol"], 1)


class ReenvioTest(BaseFlujo):  # HU05B
    def test_corrige_y_reenvia_cambia_a_tramitada_y_vuelve_a_la_bandeja(self):
        id_f = self.crea()
        self.devuelve(id_f)
        res = main.reenviaInterconsulta(
            id_f, BGInmediato(), main.EdicionAdministrativa(descripcion="Dolor + hemograma adjunto"), self.admin)
        self.assertEqual(res["interconsulta"]["nombreEstado"], "Tramitada")
        f = self.fila(id_f)
        self.assertEqual((f["idEstado"], f["descripcion"]), (srv.E_TRAMITADA, "Dolor + hemograma adjunto"))
        self.assertEqual([b["idFormulario"] for b in main.bandejaEspecialista(self.esp)], [id_f])

    def test_reenvio_sin_cambios_tambien_es_valido(self):
        id_f = self.crea()
        self.devuelve(id_f)
        main.reenviaInterconsulta(id_f, BGInmediato(), None, self.admin)
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_TRAMITADA)

    def test_solo_se_reenvia_una_devuelta(self):
        id_f = self.crea()
        self.assertHTTP(409, main.reenviaInterconsulta, id_f, BGInmediato(), None, self.admin)

    def test_ciclo_devolver_reenviar_aceptar(self):
        id_f = self.crea()
        self.devuelve(id_f)
        main.reenviaInterconsulta(id_f, BGInmediato(), None, self.admin)
        self.revisa(id_f, "aceptar")
        estados = [h["estadoNuevo"] for h in main.obtieneHistorial(id_f, self.admin)]
        self.assertEqual(estados, ["Registrada", "Devuelta", "Tramitada", "En lista de espera"])

    def test_notifica_al_paciente_al_reenviar(self):
        id_f = self.crea()
        self.devuelve(id_f)
        main.reenviaInterconsulta(id_f, BGInmediato(), None, self.admin)
        self.assertIn("en trámite", self.correos(id_f, "paciente")[-1]["asunto"])


class HistorialTest(BaseFlujo):  # HU07
    def test_orden_cronologico_con_fecha_estados_y_responsable(self):
        id_f = self.crea()
        self.revisa(id_f, "aceptar")
        hist = main.obtieneHistorial(id_f, self.esp)
        self.assertEqual(len(hist), 2)
        self.assertEqual((hist[1]["estadoAnterior"], hist[1]["estadoNuevo"]), ("Registrada", "En lista de espera"))
        self.assertEqual(hist[1]["usuario"], "Dra. Especialista 1")
        self.assertTrue(hist[1]["fecha"].endswith("Z"))
        self.assertLessEqual(hist[0]["fecha"], hist[1]["fecha"])

    def test_alcance_por_establecimiento(self):
        id_f = self.crea()
        self.assertHTTP(403, main.obtieneHistorial, id_f, usuario(ESP_2, 2))
        self.assertHTTP(404, main.obtieneHistorial, 999, self.admin)


class NotificacionesTest(BaseFlujo):  # HU15
    def test_sin_correo_registrado_queda_en_bitacora(self):
        self.raw.execute("DELETE FROM persona_correos WHERE idPersona = ?", (PACIENTE,))
        id_f = self.crea()
        self.assertEqual(self.correos(id_f, "paciente")[0]["estadoEnvio"], "sin_destinatario")

    def test_cesfam_sin_correo_usa_el_de_respaldo(self):
        id_f = self.crea(idCesfam=2, idPersona=OTRO_PACIENTE)
        with mock.patch.dict(os.environ, {"CESFAM_CORREO_DEFAULT": "respaldo@salud.cl"}):
            main.notifica_cambio_estado(id_f, ("cesfam",))
        self.assertEqual(self.correos(id_f, "cesfam")[0]["destinatario"], "respaldo@salud.cl")

    def test_un_fallo_de_smtp_no_rompe_el_flujo(self):
        with mock.patch.object(srv, "enviar_correo", return_value=("error", "SMTP caído")):
            id_f = self.crea()
            self.revisa(id_f, "aceptar")
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_LISTA_ESPERA)
        self.assertEqual(self.correos(id_f, "cesfam")[0]["estadoEnvio"], "error")

    def test_bitacora_consultable(self):
        id_f = self.crea()
        self.assertEqual(len(main.obtieneNotificaciones(id_f, self.admin)), 1)


class ConcurrenciaTest(BaseFlujo):
    def test_no_pisa_un_cambio_hecho_por_otra_persona(self):
        id_f = self.crea()
        cursor = CursorFalso(self.raw)
        obsoleta = main._carga_formulario(cursor, id_f)      # lectura "vieja"
        self.revisa(id_f, "aceptar")                          # otra persona acepta antes
        # el estado de la lectura vieja (Registrada) permitiría devolver, pero ya no coincide en BD
        self.assertHTTP(409, main._cambia_estado, cursor, obsoleta, "devolver", self.esp)
        self.assertEqual(self.fila(id_f)["idEstado"], srv.E_LISTA_ESPERA)


if __name__ == "__main__":
    unittest.main()
