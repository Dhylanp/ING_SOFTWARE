
//express es el framework principal que usamos (crear servidor web y escuchar peticiones HTTP)
const express = require('express');
//cors es una herramienta de seguridad, permite a react comunicarse con node
const cors = require('cors');
//crea la instancia de la aplicacion backend
const app = express();
//puerto o direccion en el pc donde se aloja el servidor
const PORT = 5000;

//middlewares, es un filtro por el que pasa cada peticion http antes de llegar a la logica principal
app.use(cors());
//cuando el formulario envia los datos del paciente, se envian en formato json, esta linea traduce el json a un objetode javascript
//para leerlo con req.body
app.use(express.json());

// base de datos temporal
const interconsultas = [
    {
        id: 1,
        pacienteRut: '12345678-9',
        especialidadDestino: 'Cardiologia',
        prioridadClinica: 'Alta',
        motivoDerivacion: 'Paciente presenta arritmia y palpitaciones frecuentes.',
        estado: 'Emitida',
        fechaCreacion: new Date().toISOString()
    },
    {
        id: 2,
        pacienteRut: '98765432-1',
        especialidadDestino: 'Oftalmología',
        prioridadClinica: 'Baja',
        motivoDerivacion: 'Evaluación de agudeza visual para control anual.',
        estado: 'Pendiente',
        fechaCreacion: new Date().toISOString()
    }
];




//ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor backend funcionando correctamente');
});

//endpoint HU01A: registrar datos basicos de una interconsulta
//post se utiliza cuando enviamos información nueva para ser creada en el servidor
app.post('/api/interconsultas', (req, res) => {
    //extraer datos enviados en el body de la peticion http
    const { pacienteRut, especialidadDestino, prioridadClinica, motivoDerivacion } = req.body;

    //validacion, si falta un campo obligatorio se rechaza la peticion
    if (!pacienteRut || !especialidadDestino || !prioridadClinica || !motivoDerivacion) {
        return res.status(400).json({
            error: 'Faltan campos obligatorios para registrar la interconsulta.'
        });
    }

    //mock hasta conectar mysql
    const nuevaInterconsulta = {
        id: Math.floor(Math.random() * 1000) + 1,
        pacienteRut,
        especialidadDestino,
        prioridadClinica,
        motivoDerivacion,
        estado: 'Emitida',
        fechaCreacion: new Date().toISOString()
    };

    // guarda las nueva interconsultas en la lista en memoria
    interconsultas.push(nuevaInterconsulta);

    //respuesta con codigo http 201 (creado exitosamente)
    return res.status(201).json({
        mensaje: 'Interconsulta registrada exitosamente',
        data: nuevaInterconsulta
    });
});

//endpoint HU02: obtener el listado de interconsultas
app.get('/api/interconsultas', (req, res) => {
    const { estado, prioridadClinica, especialidadDestino } = req.query;

    let resultado = interconsultas;

    if (estado) {
        resultado = resultado.filter((item) => item.estado === estado);
    }

    if (prioridadClinica) {
        resultado = resultado.filter((item) => item.prioridadClinica === prioridadClinica);
    }

    if (especialidadDestino) {
        resultado = resultado.filter((item) => item.especialidadDestino === especialidadDestino);
    }
    return res.status(200).json({
        mensaje: 'Listado de interconsultas obtenido exitosamente',
        data: resultado
    });
});


//enciende el servidor para que empieze a escuchar peticiones
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

