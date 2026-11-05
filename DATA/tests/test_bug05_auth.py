import unittest
from fastapi.testclient import TestClient
import main

CUERPO = dict(descripcion="x", fechaInicio="2026-01-01", idPersona=1, idCesfam=1,
              idHospital=1, idEspecialidad=1, prioridad="media")


class FormularioAuthTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_sin_token_responde_401(self):
        self.assertEqual(self.client.post("/formulario", json=CUERPO).status_code, 401)

    def test_con_rol_paciente_responde_403(self):
        token = main.crea_token(1, 3)
        r = self.client.post("/formulario", json=CUERPO, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 403)

    def test_con_rol_especialista_responde_403(self):
        token = main.crea_token(1, 2)
        r = self.client.post("/formulario", json=CUERPO, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 403)


if __name__ == "__main__":
    unittest.main()
