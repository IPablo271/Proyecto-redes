const { client, xml } = require("@xmpp/client");
const readline = require("readline");
const debug = require("@xmpp/debug");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

class ClienteXMPP {
  constructor(username, password, service = "xmpp://alumchat.xyz:5222", domain = "alumchat.xyz") {
    this.username = username;
    this.password = password;
    this.service = service;
    this.domain = domain;
    this.xmpp = null;
  }

  async conectar() {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
    });

    this.xmpp.on("error", (err) => {
      console.error(err);
    });

    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });

    await this.xmpp.start().catch(console.error);
  }

  async enviarMensaje(destinatario, mensaje) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }

    const message = xml(
      "message",
      { type: "chat", to: destinatario },
      xml("body", {}, mensaje)
    );

    await this.xmpp.send(message);
  }

  // Add a method to disconnect from XMPP
  async desconectar() {
    if (this.xmpp) {
      await this.xmpp.stop();
      this.xmpp = null;
      console.log("Desconectado del servidor XMPP.");
    }
  }
}

// Function to read user input from the command line
function leerEntrada(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main menu function
async function menu() {
  console.log("Bienvenido al cliente XMPP!");
  console.log("1. Enviar mensaje");
  console.log("2. Salir");

  const opcion = await leerEntrada("Seleccione una opción (1 o 2): ");

  switch (opcion) {
    case "1":
      const cliente = new ClienteXMPP("gon20362", "1234");
      await cliente.conectar();

      const destinatario = await leerEntrada("Ingrese el nombre de usuario del destinatario: ");
      const mensaje = await leerEntrada("Ingrese el mensaje: ");

      await cliente.enviarMensaje(destinatario, mensaje);
      console.log("Mensaje enviado correctamente.");
      await cliente.desconectar();
      break;
    case "2":
      process.exit(0); // Exit the application with success code
      break;
    default:
      console.log("Opción inválida. Intente nuevamente.");
      break;
  }

  // After handling the chosen option, display the menu again
  await menu();
}

// Call the menu function to start the application
menu().catch((error) => {
  console.error("Error:", error);
});
