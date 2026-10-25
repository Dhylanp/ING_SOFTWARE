"""
Pruebas unitarias de la base del sistema (HU01B, HU04, HU10, HU11, HU13, HU14, HU22).

Son funciones puras o validaciones que fallan antes de tocar la base de datos, así
que no necesitan MySQL ni levantar el servidor.

    python -m pytest DATA/tests/test_base_sprint2.py
"""
import io
import os
import unittest
from types import SimpleNamespace

os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET") or "secreto-de-pruebas"

import jwt  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from DATA import main  # noqa: E402


def archivo_falso(nombre, contenido):
    """Imita el UploadFile de FastAPI: solo se usan .filename y .file."""
    return SimpleNamespace(filename=nombre, file=io.BytesIO(contenido))


class ClaveTest(unittest.TestCase):
    """HU10: las contraseñas se guardan con hash bcrypt."""

    def test_el_hash_no_es_la_clave_en_texto_plano(self):
        h = main.hash_clave("Pizarro12")
        self.assertNotEqual(h, "Pizarro12")
        self.assertTrue(h.startswith("$2"))

    def test_clave_correcta_se_verifica(self):
        self.assertTrue(main.verifica_clave("Pizarro12", main.hash_clave("Pizarro12")))

    def test_clave_incorrecta_se_rechaza(self):
        self.assertFalse(main.verifica_clave("otra", main.hash_clave("Pizarro12")))

    def test_clave_o_hash_vacios_se_rechazan(self):
        self.assertFalse(main.verifica_clave("", main.hash_clave("x")))
        self.assertFalse(main.verifica_clave("x", ""))
        self.assertFalse(main.verifica_clave("x", "no-es-un-hash"))

    def test_no_se_puede_hashear_una_clave_vacia(self):
        with self.assertRaises(ValueError):
            main.hash_clave("")


class TokenTest(unittest.TestCase):
    """HU10 y HU11: sesión con JWT y control de acceso por rol."""

    def test_el_token_lleva_persona_y_rol(self):
        datos = jwt.decode(main.crea_token(7, 2), os.environ["JWT_SECRET"], algorithms=["HS256"])
        self.assertEqual(datos["sub"], "7")
        self.assertEqual(datos["rol"], 2)

    def test_rol_permitido_pasa(self):
        verificador = main.requiere_rol(4)
        datos = verificador(authorization="Bearer " + main.crea_token(1, 4))
        self.assertEqual(datos["rol"], 4)

    def test_rol_no_permitido_recibe_403(self):
        verificador = main.requiere_rol(4)
        with self.assertRaises(HTTPException) as e:
            verificador(authorization="Bearer " + main.crea_token(1, 3))
        self.assertEqual(e.exception.status_code, 403)

    def test_sin_sesion_recibe_401(self):
        with self.assertRaises(HTTPException) as e:
            main.requiere_rol(1)(authorization=None)
        self.assertEqual(e.exception.status_code, 401)

    def test_token_adulterado_recibe_401(self):
        with self.assertRaises(HTTPException) as e:
            main.requiere_rol(1)(authorization="Bearer " + main.crea_token(1, 1) + "x")
        self.assertEqual(e.exception.status_code, 401)


class PrioridadTest(unittest.TestCase):
    """HU22: prioridad clínica Alta / Media / Baja."""

    def test_acepta_alta_media_baja_sin_importar_mayusculas(self):
        self.assertEqual(main.normaliza_prioridad_entrada(" ALTA "), "1")
        self.assertEqual(main.normaliza_prioridad_entrada("media"), "2")
        self.assertEqual(main.normaliza_prioridad_entrada("Baja"), "3")

    def test_rechaza_valores_invalidos(self):
        for malo in ("urgente", "", "4"):
            with self.assertRaises(ValueError):
                main.normaliza_prioridad_entrada(malo)
        with self.assertRaises(ValueError):
            main.normaliza_prioridad_entrada(None)

    def test_la_salida_vuelve_a_texto(self):
        self.assertEqual(main.normaliza_prioridad_salida("1"), "alta")
        self.assertIsNone(main.normaliza_prioridad_salida(None))


class ContactoTest(unittest.TestCase):
    """HU13 y HU14: validación de teléfonos y correos."""

    def test_telefono_valido_se_normaliza_sin_espacios(self):
        r = main._normaliza_telefonos([main.TelefonoEntrada(numero="9 1234 5678", tipo="P")])
        self.assertEqual(r, [("912345678", "P")])

    def test_telefono_duplicado_se_elimina(self):
        t = main.TelefonoEntrada(numero="912345678", tipo="P")
        self.assertEqual(len(main._normaliza_telefonos([t, t])), 1)

    def test_telefono_con_pocos_digitos_se_rechaza(self):
        with self.assertRaises(HTTPException) as e:
            main._normaliza_telefonos([main.TelefonoEntrada(numero="1234", tipo="P")])
        self.assertEqual(e.exception.status_code, 400)

    def test_tipo_de_contacto_invalido_se_rechaza(self):
        with self.assertRaises(ValidationError):
            main.TelefonoEntrada(numero="912345678", tipo="X")

    def test_correo_valido_pasa_y_duplicado_se_elimina(self):
        self.assertEqual(main._normaliza_correos(["a@b.cl", "A@B.cl"]), ["a@b.cl"])

    def test_correo_invalido_se_rechaza(self):
        for malo in ("sin-arroba", "a@", "a" * 50 + "@b.cl"):
            with self.assertRaises(HTTPException) as e:
                main._normaliza_correos([malo])
            self.assertEqual(e.exception.status_code, 400)


class DocumentoPdfTest(unittest.TestCase):
    """HU01B: solo se aceptan PDF válidos de hasta 5 MB (se rechazan antes de usar la base de datos)."""

    def intenta(self, nombre, contenido):
        with self.assertRaises(HTTPException) as e:
            main.subeDocumento(1, archivo_falso(nombre, contenido))
        return e.exception

    def test_rechaza_extension_que_no_es_pdf(self):
        err = self.intenta("ficha.docx", b"%PDF-1.4 x")
        self.assertEqual(err.status_code, 400)
        self.assertIn("PDF", err.detail)

    def test_rechaza_archivo_vacio(self):
        self.assertIn("vacío", self.intenta("ficha.pdf", b"").detail)

    def test_rechaza_archivo_mayor_a_5_mb(self):
        grande = b"%PDF-" + b"0" * main.MAX_PDF_BYTES
        self.assertIn("5 MB", self.intenta("ficha.pdf", grande).detail)

    def test_rechaza_archivo_corrupto_con_extension_pdf(self):
        self.assertIn("no es un PDF válido", self.intenta("ficha.pdf", b"esto no es un pdf").detail)


if __name__ == "__main__":
    unittest.main()
