
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

//ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor backend funcionando correctamente');
});

//endpoint, registrar datos basicos de una interconsulta
//post se utiliza cuando enviamos información nueva para ser creada en el servidor
app.post('/api/interconsultas', (req, res) => {
    //extraer datos enviados en el body de la peticion http
    const {pacienteRut, especialidadDestino, prioridadClinica, motivoDerivacion} = req.body;

    //validacion, si falta un campo obligatorio se rechaza la peticion
    if (!pacienteRut || !especialidadDestino || !prioridadClinica || !motivoDerivacion){
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

    //respuesta con codigo http 201 (creado exitosamente)
    return res.status(201).json({
        mensaje: 'Interconsulta registrada exitosamente',
        data: nuevaInterconsulta
    });
});



//enciende el servidor para que empieze a escuchar peticiones
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

