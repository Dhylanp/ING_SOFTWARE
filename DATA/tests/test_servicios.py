"""
Pruebas unitarias de la lógica pura (sin base de datos ni FastAPI).

Ejecutar desde la raíz del repo:
    python -m pytest DATA/tests            (o)   python -m unittest discover -s DATA/tests -t .
"""
import os
import unittest
from datetime import datetime
from unittest import mock

from DATA import servicios as srv


class TransicionesTest(unittest.TestCase):
    def test_aceptar_y_devolver_solo_desde_registrada_o_tramitada(self):
        for origen in (srv.E_REGISTRADA, srv.E_TRAMITADA):
            self.assertEqual(srv.valida_transicion("aceptar", origen), srv.E_LISTA_ESPERA)
            self.assertEqual(srv.valida_transicion("devolver", origen), srv.E_DEVUELTA)
        for origen in (srv.E_LISTA_ESPERA, srv.E_DEVUELTA, srv.E_AGENDADA, srv.E_FINALIZADA):
            with self.assertRaises(ValueError):
                srv.valida_transicion("aceptar", origen)

    def test_reenviar_solo_desde_devuelta(self):
        self.assertEqual(srv.valida_transicion("reenviar", srv.E_DEVUELTA), srv.E_TRAMITADA)
        with self.assertRaises(ValueError):
            srv.valida_transicion("reenviar", srv.E_REGISTRADA)

    def test_accion_desconocida(self):
        with self.assertRaises(ValueError):
            srv.valida_transicion("borrar", 1)


class FechasTest(unittest.TestCase):
    def test_iso_utc(self):
        self.assertEqual(srv.iso_utc(datetime(2026, 10, 18, 14, 5, 7)), "2026-10-18T14:05:07Z")
        self.assertEqual(srv.iso_utc("2026-10-18 14:05:07.123"), "2026-10-18T14:05:07.123Z")
        self.assertIsNone(srv.iso_utc(None))


class PlantillasTest(unittest.TestCase):
    def test_cada_etapa_tiene_plantilla_propia(self):
        etapas = (srv.E_REGISTRADA, srv.E_LISTA_ESPERA, srv.E_DEVUELTA, srv.E_TRAMITADA)
        asuntos = set()
        for estado in etapas:
            asunto, cuerpo = srv.correo_paciente(estado, "Ana Pérez", 42, "Cardiología", "Hospital X")
            self.assertIn("#42", asunto)
            self.assertIn("Ana Pérez", cuerpo)
            asuntos.add(asunto)
        self.assertEqual(len(asuntos), len(etapas), "cada etapa debe usar una plantilla distinta")

    def test_no_se_filtran_datos_clinicos(self):
        # la plantilla de devolución al paciente no recibe ni muestra el motivo clínico
        _, cuerpo = srv.correo_paciente(srv.E_DEVUELTA, "Ana", 7, "Cardiología", "Hospital X")
        self.assertNotIn("motivo", cuerpo.lower())
        self.assertNotIn("diagn", cuerpo.lower())
        _, cuerpo_cesfam = srv.correo_cesfam(srv.E_DEVUELTA, 7, "CESFAM Norte", "Hospital X")
        self.assertIn("Interconsultas devueltas", cuerpo_cesfam)
        self.assertIn("confidencialidad", cuerpo_cesfam)

    def test_correo_cesfam_aceptada_y_devuelta(self):
        a, _ = srv.correo_cesfam(srv.E_LISTA_ESPERA, 9, "CESFAM Norte", "Hospital X")
        d, _ = srv.correo_cesfam(srv.E_DEVUELTA, 9, "CESFAM Norte", "Hospital X")
        self.assertIn("ACEPTADA", a)
        self.assertIn("DEVUELTA", d)


class EnvioCorreoTest(unittest.TestCase):
    def test_sin_destinatario(self):
        self.assertEqual(srv.enviar_correo("", "a", "b")[0], "sin_destinatario")
        self.assertEqual(srv.enviar_correo("no-es-correo", "a", "b")[0], "sin_destinatario")

    def test_simulado_sin_smtp(self):
        with mock.patch.dict(os.environ, {"SMTP_HOST": ""}):
            self.assertEqual(srv.enviar_correo("a@b.cl", "asunto", "cuerpo")[0], "simulado")

    def test_envio_real_con_smtp_mockeado(self):
        env = {"SMTP_HOST": "smtp.test", "SMTP_PORT": "587", "SMTP_USER": "u", "SMTP_PASSWORD": "p"}
        with mock.patch.dict(os.environ, env), mock.patch("smtplib.SMTP") as smtp:
            estado, _ = srv.enviar_correo("a@b.cl", "asunto", "cuerpo")
        self.assertEqual(estado, "enviado")
        servidor = smtp.return_value.__enter__.return_value
        servidor.starttls.assert_called_once()
        servidor.login.assert_called_once_with("u", "p")
        servidor.send_message.assert_called_once()

    def test_fallo_smtp_no_lanza(self):
        with mock.patch.dict(os.environ, {"SMTP_HOST": "smtp.test"}), \
                mock.patch("smtplib.SMTP", side_effect=OSError("sin red")):
            estado, detalle = srv.enviar_correo("a@b.cl", "asunto", "cuerpo")
        self.assertEqual(estado, "error")
        self.assertIn("sin red", detalle)


if __name__ == "__main__":
    unittest.main()
