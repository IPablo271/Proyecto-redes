const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function leerInput(pregunta) {
    return new Promise((resolve) => {
        rl.question(pregunta, (respuesta) => {
            resolve(respuesta);
        });
    });
}

async function mostrarMenuPrincipal() {
    console.log("Bienvenido al Menú Principal");
    console.log("1. Iniciar Sesión");
    console.log("2. Crear Cuenta");
    console.log("3. Eliminar Cuenta");
    console.log("4. Salir");

    const opcion = await leerInput("Seleccione una opción (1-4): ");

    switch (opcion) {
        case "1":
            await mostrarMenuSesion();
            break;

        case "2":
            console.log("Opción: Crear Cuenta");
            // Agregar lógica para crear cuenta
            break;

        case "3":
            console.log("Opción: Eliminar Cuenta");
            // Agregar lógica para eliminar cuenta
            break;

        case "4":
            console.log("Saliendo...");
            rl.close();
            return;

        default:
            console.log("Opción inválida. Por favor, seleccione una opción válida.");
            break;
    }

    mostrarMenuPrincipal();
}

async function mostrarMenuSesion() {
    console.log("Menú de Sesión");
    console.log("1. Enviar Mensaje");
    console.log("2. Agregar Contacto");
    console.log("3. Obtener Contactos");
    console.log("4. Salir al Menú Principal");

    const opcion = await leerInput("Seleccione una opción (1-4): ");

    switch (opcion) {
        case "1":
            console.log("Opción: Enviar Mensaje");
            // Agregar lógica para enviar mensaje
            break;

        case "2":
            console.log("Opción: Agregar Contacto");
            // Agregar lógica para agregar contacto
            break;

        case "3":
            console.log("Opción: Obtener Contactos");
            // Agregar lógica para obtener contactos
            break;

        case "4":
            console.log("Volviendo al Menú Principal...");
            break;

        default:
            console.log("Opción inválida. Por favor, seleccione una opción válida.");
            break;
    }

    mostrarMenuPrincipal();
}

mostrarMenuPrincipal();
