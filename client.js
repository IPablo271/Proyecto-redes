const { client, xml } = require("@xmpp/client");
const readline = require("readline");
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
    this.receivedSubscriptions = [];
    this.recivedSuscriptionsGroup = [];
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
      await this.xmpp.send(xml("presence",{type: "online"}));
      this.xmpp.on("stanza", (stanza) => {
        if (stanza.is("message") && stanza.attrs.type == "chat"){
          const body = stanza.getChild("body");
          const from =  stanza.attrs.from;
          if (body){
            const messageText = body.children[0];
            const sender = from.split('@')[0];
            console.log(`\nMensaje recibido de ${sender}:`, messageText);
          }
        }
        else if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
          const from = stanza.attrs.from;
          this.receivedSubscriptions.push(from);
          console.log("\nSolicitud de amistad recibida de:", from.split('@')[0]);
          console.log("Mensaje enviado:", stanza.getChildText("status"));

        } else if(stanza.is('message') && stanza.getChild('body')) {
          if (stanza.attrs.type === "groupchat") {
            const from = stanza.attrs.from;
            const body = stanza.getChildText("body");

            if (from && body) {
              console.log(`Mensaje de grupo: ${from}: ${body}`);
            }
          }
        }


      })





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
  async enviarMensajeGrupo(destinatario, mensaje) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado.");
    }
    const message = xml(
      "message",
      { type: "groupchat", to: destinatario },
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
          const subscription = item.attrs.subscription;
  
          contacts[jid] = { name, presence: "offline", subscription: subscription || "none" };
        });
      } else if (stanza.is("presence")) {
        const from = stanza.attrs.from;
        if (from in contacts) {
          contacts[from].presence = stanza.attrs.type || "online";
        }
      } else if (stanza.is("presence") && stanza.attrs.type === "subscribe") {
        const from = stanza.attrs.from;
        if (from in contacts) {
          contacts[from].subscription = "pending";
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

  async getContactDetails(username) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }
  
    const iq = xml(
      "iq",
      { type: "get" },
      xml("query", { xmlns: "jabber:iq:roster" }, xml("item", { jid: `${username}@alumchat.xyz` }))
    );
  
    const contactDetails = {};
  
    this.xmpp.on("stanza", (stanza) => {
      if (stanza.is("iq") && stanza.attrs.type === "result") {
        const query = stanza.getChild("query", "jabber:iq:roster");
        if (query) {
          const item = query.getChild("item");
          if (item) {
            const name = item.attrs.name || username;
            const subscription = item.attrs.subscription || "none";
  
            contactDetails[name] = { presence: "offline", subscription };
          }
        }
      } else if (stanza.is("presence")) {
        const from = stanza.attrs.from;
        if (from in contactDetails) {
          contactDetails[from].presence = stanza.attrs.type || "online";
        }
      }
    });
  
    await this.xmpp.send(iq);
  
    return new Promise((resolve) => {
      this.xmpp.on("stanza", (stanza) => {
        if (stanza.is("iq") && stanza.attrs.type === "result") {
          resolve(contactDetails);
        }
      });
    });
  }
  
  
  async addContacts(jid) {

    const presence = xml("presence", {type: "subscribe", to: jid + "@alumchat.xyz"});
    this.xmpp.send(presence).then(() => {
        console.log("\nContacto agregado correctamente.");
    }).catch((err) => {
        console.error("Error when adding contact: ", err);
    });
  };
  async inviteToGroupChat(roomName, userI) {
    const roomId = roomName + "@conference.alumchat.xyz";
    const inviteRequest = xml("message", {to: roomId}, xml("x", {xmlns: "http://jabber.org/protocol/muc#user"}, xml("invite", {to: userI + "@alumchat.xyz"}, xml("reason", {}, "Join the group!"))));
    await this.xmpp.send(inviteRequest);
    console.log("Invitation sent to: ", userI);
  }
  async createGC(roomName) {
    const roomId = roomName + "@conference.alumchat.xyz";

    // If group chat is not found in the server, it will be created
    await this.xmpp.send(xml("presence", {to: roomId + "/" + this.username}));
    console.log("Joined group chat succesfully");

  }
  async aceptarSolicitud(uusario){
    const presence = xml("presence", {type: "subscribed", to: uusario + "@alumchat.xyz"});
    this.xmpp.send(presence).then(() => {
        console.log("\nSolicitud aceptada correctamente.");
    }).catch((err) => {
        console.error("Error when adding contact: ", err);
    });

  }
  async unierseGrupo(roomName) {
    const roomId = roomName + "@conference.alumchat.xyz";
    await this.xmpp.send(xml("presence", {to: roomId + "/" + this.username}));
    console.log("Se unio al grupo exitosamente");
    let mensaje;
      while (mensaje !== "salir#") {
        mensaje = await leerEntrada("Escribe un mensaje (escribe 'salir#' para salir): ");
        if (mensaje !== "salir#") {
          await this.enviarMensajeGrupo(roomId, mensaje);
        }
      }
    await menuCliente(this);
    
  }
  async setPresencia(estado,mensaje) {
    const presence = xml("presence", {}, xml('show', {}, estado), xml('status', {}, mensaje));
    await this.xmpp.send(presence);
    console.log("Estado actualizado correctamente")
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
  console.log("1. Comunicacion 1 a 1");
  console.log("2. Agregar contacto");
  console.log("3. Mostrar detalles de contacto");
  console.log("4. Mostrar todos los contactos y su estado");
  console.log("5. Converssaciones grupales");
  console.log("6. Definir mensaje de precesencia");
  console.log("7. Eliminar cuenta");
  console.log("8. Cerrar sesión");
  console.log("9. Salir de la aplicación");

  const opcion = await leerEntrada("Seleccione una opción: ");

  switch (opcion) {
    case "1":
      const destinatario = await leerEntrada("Ingrese el nombre de usuario del destinatario: ");


      // Continuously listen for new messages until the user types "salir#"
      let mensaje;
      while (mensaje !== "salir#") {
        mensaje = await leerEntrada("Escribe un mensaje (escribe 'salir#' para salir): ");
        if (mensaje !== "salir#") {
          await cliente.enviarMensaje(destinatario, mensaje);
        }
      }
      await menuCliente(cliente);
      break;
    case "2":
      console.log("1. Agregar contacto");
      console.log("2. Ver solicitudes de amistad");
      console.log("3. Salir");
      const opcioncontatcto = await leerEntrada("Seleccione una opción: ");
      switch (opcioncontatcto) {
        case "1":
          const nuevoContacto = await leerEntrada("Ingrese el nombre de usuario del nuevo contacto: ");
          await cliente.addContacts(nuevoContacto);
          await menuCliente(cliente);
          break;
        case "2":
          console.log("Solicitudes de amistad");
          if (cliente.receivedSubscriptions.length === 0) {
            console.log("No hay solicitudes de amistad pendientes")
            await menuCliente(cliente);
            break;

          }else{
            cliente.receivedSubscriptions.forEach((subscription) => {
              console.log("Solicitud de amistad del usuario: "+ subscription.split('@')[0]);
            });
            console.log("Desea agregar alguno de los usuarios (si/no): ")
            const opcionAgregar = await leerEntrada("Seleccione una opción: ");
            if (opcionAgregar === "si") {
              const nuevoContacto = await leerEntrada("Ingrese el nombre de usuario del nuevo contacto: ");   
                await cliente.aceptarSolicitud(nuevoContacto);
                await menuCliente(cliente);

            }
            else{
              await menuCliente(cliente);
              break;
            }
            
          }
          

        case "3":
          await menuCliente(cliente);
          break;
      }
      
      
    case "3":
      const contactUsername = await leerEntrada("Ingrese el nombre de usuario del contacto: ");
      const contactDetails = await cliente.getContactDetails(contactUsername);
      if (Object.keys(contactDetails).length === 0) {
        console.log("No se encontraron detalles para ese contacto.");
      } else {
        console.log("Detalles del contacto:");
        Object.entries(contactDetails).forEach(([name, details]) => {
          console.log(`Nombre: ${name}, Presencia: ${details.presence}, Suscripción: ${details.subscription}`);
        });
      }
      await menuCliente(cliente);
      break;
    case "4":
      const contactos = await cliente.obtenerContactos();
      console.log("Tus contactos son:");
      contactos.forEach((contacto) => {
        console.log(`${contacto.name}: Presence: ${contacto.presence}, Subscription: ${contacto.subscription}`);
      });
      await menuCliente(cliente);
      break;
    case "5":
      console.log("Converssaciones grupales");

      console.log("1. Crear chat grupal");
      console.log("2. Unirse a chat grupal");
      const opcion2 = await leerEntrada("Seleccione una opción: ");

      switch (opcion2) {
        case "1":
          console.log("Crear chat grupal");
          const nombregrupo = await leerEntrada("Ingrese el nombre del grupo: ");
          await cliente.createGC(nombregrupo);
          console.log("Grupo creado con exito");

          console.log("\n1. Invitar a un usuario");
          console.log("2. Enviar mensaje al grupo");
          console.log("3. Salir");
          const opcion3 = await leerEntrada("Seleccione una opción: ");
          switch (opcion3) {
            case "1":
              
              const invitado = await leerEntrada("Ingrese el nombre de usuario a invitar: ");
              await cliente.inviteToGroupChat(nombregrupo, invitado);
              await cliente.enviarMensajeGrupo(nombregrupo, "¡Bienvenido al grupo!")
              let mensaje_agregar
              while (mensaje_agregar !== "no") {
                mensaje_agregar = await leerEntrada("¿Desea agregar otro usuario? (si/no): ");
                if (mensaje_agregar === "si") {
                  const invitado = await leerEntrada("Ingrese el nombre de usuario a invitar: ");
                  await cliente.inviteToGroupChat(nombregrupo, invitado);
                }

              }
              await menuCliente(cliente);
              break;

            case "2":
              let mensaje;
              while (mensaje !== "salir#") {
                mensaje = await leerEntrada("Escribe un mensaje (escribe 'salir#' para salir): ");
                if (mensaje !== "salir#") {
                  await cliente.enviarMensajeGrupo(nombregrupo, mensaje);
                }

              }
              await menuCliente(cliente);
              break;
            case "3":
              await menuCliente(cliente);
              break

          }
          await menuCliente(cliente);
          break

        case "2":
          console.log("Unirse a chat grupal");
          const nombregrupo2 = await leerEntrada("Ingrese el nombre del grupo: ");
          await cliente.unierseGrupo(nombregrupo2);
          
          
        default:
          console.log("Opción inválida. Intente nuevamente.");
          await menuCliente(cliente);
          break;
      }

      break;
    case "6":
      const estado = await leerEntrada("Ingrese el estado: ");
      const mensajepres = await leerEntrada("Ingrese el mensaje: ");
      await cliente.setPresencia(estado,mensajepres);
      await menuCliente(cliente);
      break;
    case "7":
      console.log("Eliminando cuenta");
      await cliente.deleteAccount();
      await menu();
    case "8":
      if(cliente.isConnected()){
        await cliente.desconectar();
        console.log("¡Sesión cerrada correctamente!");
      }else{
        console.log("No hay sesión activa para cerrar.");
      }
      await menu();
      break;    
    case "9":
      process.exit(0); // Salir de la aplicación con éxito
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
