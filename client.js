const { client, xml } = require("@xmpp/client");
const readline = require("readline");
const debug = require("@xmpp/debug");
const net = require('net');
const cliente = new net.Socket();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function register(username, password) {
  cliente.connect(5222, 'alumchat.xyz', function() {
    cliente.write("<stream:stream to='alumchat.xyz' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>");
  });

  cliente.on('data', async function(data) {
    if (data.toString().includes('<stream:features>')) {
      const xmlRegister = `
        <iq type="set" id="reg_1" mechanism='PLAIN'>
          <query xmlns="jabber:iq:register">
            <username>${username}</username>
            <password>${password}</password>
          </query>
        </iq>
      `;
      cliente.write(xmlRegister);
    } else if (data.toString().includes('<iq type="result"')) {
      console.log('Registro exitoso');
      await menu();
    } else if (data.toString().includes('<iq type="error"')) {
      console.log("No se pudo registrar el usuario");
      await menu();
      cliente.end(); // Cerrar la conexión en caso de error
    }
  });
}

class ClienteXMPP {
  constructor(username, password, service = "xmpp://alumchat.xyz:5222", domain = "alumchat.xyz") {
    this.username = username;
    this.password = password;
    this.service = service;
    this.domain = domain;
    this.xmpp = null;
  }
  async deleteAccount() {
    return new Promise((resolve, reject) => {
      if (!this.xmpp) {
        reject(new Error("Error in connection, please try again."));
      }
  
      const deleteStanza = xml(
        'iq',
        { type: 'set', id: 'delete' },
        xml('query', { xmlns: 'jabber:iq:register' },
          xml('remove')
        )
      );
  
      this.xmpp.send(deleteStanza).then(async () => {
        await this.xmpp.stop();
        this.xmpp = null;
        this.username = null;
        this.password = null;
        resolve();
      }).catch((err) => {
        reject(new Error('Error al eliminar la cuenta.'));
      });
  
      this.xmpp.on('error', (err) => {
        // Handle any errors that might occur
      });
    });
  }

 

  async conectar() {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
    });
  
    this.xmpp.on("error", (err) => {
      if (err.condition !== 'not-authorized') { // Evita imprimir el error 'not-authorized'
        console.error("Error en la conexión:", err);
      }
    });
  
    this.xmpp.on("online", async () => {
      console.log("Conexión exitosa.");
      await this.xmpp.send(xml("presence"));
      // Realiza otras acciones después de establecer la conexión.
    });
  
    await this.xmpp.start().catch((err) => {
      if (err.condition !== 'not-authorized') { // Evita imprimir el error 'not-authorized'
        console.error(err);
      }
    });
  }
  isConnected() {
    return this.xmpp !== null && this.xmpp.status === "online";
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
      try {
        await cliente.conectar();
        if(cliente.isConnected()){
          await menuCliente(cliente);
        }else{
          console.error("Error al iniciar sesión. Verifique sus credenciales.");
          await menu();
        }

      }catch (error) {
        console.error(error);
        await menu();
      }
      break;
    case "2":
      const newUsername = await leerEntrada("Ingrese su nuevo nombre de usuario: ");
      const newPassword = await leerEntrada("Ingrese su nueva contraseña: ");

      register(newUsername, newPassword);
      break;

    case "3":
      const username3 = await leerEntrada("Ingrese su nombre de usuario: ");
      const password3 = await leerEntrada("Ingrese su contraseña: ");
      await deleteAccount(username3, password3);
      await menu(); // Regresar al menú principal
    case "4":
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
  console.log("5. Eliminar cuenta");
  console.log("6. Salir");

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
      if(cliente.isConnected()){
        await cliente.desconectar();
        console.log("¡Sesión cerrada correctamente!");
      }else{
        console.log("No hay sesión activa para cerrar.");
      }
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
      await cliente.deleteAccount();
      await menu(); // Salir de la aplicación después de eliminar la cuenta
      break;    
    case "6":
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
