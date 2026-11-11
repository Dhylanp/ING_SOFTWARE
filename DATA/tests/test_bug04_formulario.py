import unittest
from datetime import timedelta
from pydantic import ValidationError
from DATA import main


def base(**kw):
    d = dict(descripcion="Dolor", fechaInicio=main.hoy_chile(), idPersona=1, idCesfam=1,
             idHospital=1, idEspecialidad=1, prioridad="media")
    d.update(kw)
    return d


class FormularioEntradaTest(unittest.TestCase):
    def test_valido(self):
        main.formularioEntrada(**base())

    def test_rechaza_descripcion_vacia_o_con_espacios(self):
        for v in ("", "   "):
            with self.assertRaises(ValidationError):
                main.formularioEntrada(**base(descripcion=v))

    def test_rechaza_fecha_futura(self):
        with self.assertRaises(ValidationError):
            main.formularioEntrada(**base(fechaInicio=main.hoy_chile() + timedelta(days=1)))

    def test_rechaza_fecha_de_1900(self):
        from datetime import date
        with self.assertRaises(ValidationError):
            main.formularioEntrada(**base(fechaInicio=date(1900, 1, 1)))


if __name__ == "__main__":
    unittest.main()
