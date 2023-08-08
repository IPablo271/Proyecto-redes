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
  async obtenerContactos() {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }
  
    const iq = xml(
      "iq",
      { type: "get", id: "roster" },
      xml("query", { xmlns: "jabber:iq:roster" })
    );
  
    const contacts = {};
  
    this.xmpp.on("stanza", (stanza) => {
      if (stanza.is("iq") && stanza.attrs.id === "roster") {
        stanza.getChildren("query")[0].getChildren("item").forEach((item) => {
          const jid = item.attrs.jid;
          const name = item.attrs.name || jid.split("@")[0];
          contacts[jid] = { name, presence: "offline" };
        });
      } else if (stanza.is("presence")) {
        const from = stanza.attrs.from;
        if (from in contacts) {
          contacts[from].presence = stanza.attrs.type || "online";
        }
      }
    });
  
    await this.xmpp.send(iq);
  
    return new Promise((resolve) => {
      this.xmpp.on("stanza", (stanza) => {
        if (stanza.is("iq") && stanza.attrs.id === "roster") {
          resolve(Object.values(contacts));
        }
      });
    });
  }
  
  
  
  
  


  async agregarContacto(contacto) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }

    const iq = xml(
      "iq",
      { type: "set" },
      xml(
        "query",
        { xmlns: "jabber:iq:roster" },
        xml("item", { jid: `${contacto}@${this.domain}`, name: contacto })
      )
    );

    await this.xmpp.send(iq);
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
  console.log("1. Iniciar sesión");
  console.log("2. Crear cuenta");
  console.log("3. Salir");

  const opcion = await leerEntrada("Seleccione una opción (1, 2 o 3): ");

  switch (opcion) {
    case "1":
      const username = await leerEntrada("Ingrese su nombre de usuario: ");
      const password = await leerEntrada("Ingrese su contraseña: ");

      const cliente = new ClienteXMPP(username, password);
      await cliente.conectar();

      console.log("¡Inicio de sesión exitoso!");
      await menuCliente(cliente);
      break;
    case "2":
      console.log("Funcionalidad de crear cuenta no implementada en este ejemplo.");
      await menu(); // Regresar al menú principal
      break;
    case "3":
      process.exit(0); // Salir de la aplicación con éxito
      break;
    default:
      console.log("Opción inválida. Intente nuevamente.");
      await menu();
      break;
  }
}

// Menu function after successful login
async function menuCliente(cliente) {
  console.log("1. Enviar mensaje");
  console.log("2. Cerrar sesión");
  console.log("3. Agregar contacto");
  console.log("4. Obtener contactos");
  console.log("5. Salir");

  const opcion = await leerEntrada("Seleccione una opción (1, 2 o 3): ");

  switch (opcion) {
    case "1":
      const destinatario = await leerEntrada("Ingrese el nombre de usuario del destinatario: ");
      const mensaje = await leerEntrada("Ingrese el mensaje: ");
      await cliente.enviarMensaje(destinatario, mensaje);
      console.log("Mensaje enviado correctamente.");
      await menuCliente(cliente);
      break;
    case "2":
      await cliente.desconectar();
      console.log("¡Sesión cerrada correctamente!");
      await menu();
      break;
    case "3":
      
    case "4":
      const contactos = await cliente.obtenerContactos();
      console.log("Tus contactos son:");
      contactos.forEach((contacto) => console.log(`${contacto.name}: ${contacto.presence}`));
      await menuCliente(cliente);
      break;       
    case "5":
      process.exit(0); // Salir de la aplicación con éxito
      break;
    default:
      console.log("Opción inválida. Intente nuevamente.");
      await menuCliente(cliente);
      break;
  }
}

// Call the menu function to start the application
menu().catch((error) => {
  console.error("Error:", error);
});
