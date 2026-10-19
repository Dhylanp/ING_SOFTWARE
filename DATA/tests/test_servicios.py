"""
Pruebas unitarias de la lógica pura (sin base de datos ni FastAPI).

Ejecutar desde la raíz del repo:
    python -m pytest DATA/tests            (o)   python -m unittest discover -s DATA/tests -t .
"""
import unittest
from datetime import datetime

from DATA import servicios as srv


class FechasTest(unittest.TestCase):
    def test_iso_utc(self):
        self.assertEqual(srv.iso_utc(datetime(2026, 10, 18, 14, 5, 7)), "2026-10-18T14:05:07Z")
        self.assertEqual(srv.iso_utc("2026-10-18 14:05:07.123"), "2026-10-18T14:05:07.123Z")
        self.assertIsNone(srv.iso_utc(None))


if __name__ == "__main__":
    unittest.main()
