import re
import unittest
from pathlib import Path

from DATA import main

FUENTE = Path(main.__file__).read_text(encoding="utf8")


class ErroresInternosTest(unittest.TestCase):
    def test_ningun_500_devuelve_el_texto_de_la_excepcion(self):
        self.assertIsNone(re.search(r"status_code=500, detail=.*str\(e\)", FUENTE))
        self.assertEqual(main.ERROR_INTERNO, "Error interno del servidor")

    def test_sincronizar_no_filtra_el_error_de_mysql(self):
        self.assertNotIn('str(e)[:200]', FUENTE)

    def test_existe_id_solo_acepta_tablas_conocidas(self):
        with self.assertRaises(AssertionError):
            main.existe_id(None, "usuarios; DROP TABLE x", "id", 1)


if __name__ == "__main__":
    unittest.main()
