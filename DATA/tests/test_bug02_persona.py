import unittest
from datetime import date
from pydantic import ValidationError
from DATA import main


def base(**kw):
    d = dict(rut=99999995, dv="6", nombrePersona="Ana Prueba", clave="Clave1234",
             fechaNac=date(2000, 1, 1), calle="Calle 1", idComuna=1)
    d.update(kw)
    return d


class PersonaEntradaTest(unittest.TestCase):
    def test_valida(self):
        main.personaEntrada(**base())

    def test_dv_k_en_minuscula(self):
        # 12345670-K? se calcula con la función para no fijar un RUT ficticio
        rut = next(r for r in range(10000000, 10000100) if main.dv_correcto(r, "K"))
        main.personaEntrada(**base(rut=rut, dv="k"))

    def test_rechaza_rut_cero_o_negativo(self):
        for rut in (0, -5):
            with self.assertRaises(ValidationError):
                main.personaEntrada(**base(rut=rut))

    def test_rechaza_rut_de_mas_de_8_digitos(self):
        with self.assertRaises(ValidationError):
            main.personaEntrada(**base(rut=12345678901))

    def test_rechaza_dv_incorrecto(self):
        with self.assertRaises(ValidationError):
            main.personaEntrada(**base(dv="5"))

    def test_rechaza_textos_vacios_o_largos(self):
        for campo in ("nombrePersona", "calle"):
            for valor in ("", "   ", "x" * 51):
                with self.assertRaises(ValidationError):
                    main.personaEntrada(**base(**{campo: valor}))

    def test_rechaza_fecha_del_ano_1(self):
        with self.assertRaises(ValidationError):
            main.personaEntrada(**base(fechaNac=date(1, 1, 1)))


if __name__ == "__main__":
    unittest.main()
