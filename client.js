// Universidad del Valle de Guatemala
// Redes - Seccion 10
//Nombre: Pablo Gonzalez 20362
//Proyecto Redes
/**
 * Este proyecto es un cliente de chat desarrollado en JavaScript utilizando la biblioteca @xmpp/client. Permite a los usuarios iniciar sesión en un servidor XMPP, 
 * crear cuentas, enviar mensajes individuales y en grupo, administrar contactos, definir estados de presencia y más. El cliente se ejecuta en la línea de comandos y proporciona una interfaz 
 * de usuario interactiva para realizar estas acciones. El cliente se conecta a un servidor XMPP (alumchat.xyz) y utiliza protocolos XMPP para la comunicación y gestión de contactos. 
 * El código implementa múltiples funcionalidades, como iniciar sesión, agregar contactos, unirse a chats grupales, definir estados de presencia, eliminar cuentas y más.
 */

// Importar las bibliotecas necesarias
const { client, xml } = require("@xmpp/client");
const readline = require("readline");
const net = require('net');
const cliente = new net.Socket();
const fs = require("fs");
const path = require('path');
// Deshabilitar la validación de certificados SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Función para registrar un nuevo usuario en el servidor XMPP.
 * @param {*} username - usuario que se va a registrar
 * @param {*} password - contraseña del usuario
 */

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
/**
 * Clase ClienteXMPP: Esta clase representa un cliente XMPP que se conecta a un servidor XMPP (alumchat.xyz por defecto) y proporciona funcionalidades para 
 * realizar acciones como la gestión de la cuenta, enviar mensajes individuales y grupales, administrar contactos, definir estados de presencia, y más. 
 * La clase utiliza la biblioteca @xmpp/client para interactuar con el servidor y manejar los protocolos XMPP. Permite establecer una conexión, enviar mensajes, 
 * agregar contactos, unirse a chats grupales, definir estados de presencia, y administrar la cuenta. También incluye métodos para desconectarse del servidor y verificar si 
 * la conexión está activa.
 */
class ClienteXMPP {
  /**
   * Constructor de la clase ClienteXMPP.
   * @param {*} username - nombre de usuario
   * @param {*} password - contraseña
   * @param {*} service - servicio XMPP
   * @param {*} domain - dominio XMPP
   */
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

 
  /**
   * Método para establecer una conexión con el servidor XMPP.
   * @returns - una promesa que se resuelve cuando se establece la conexión.
   */
  async conectar() {
    // Crear un nuevo cliente XMPP
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
    });
    // Manejo de errores
    this.xmpp.on("error", (err) => {
      if (err.condition !== 'not-authorized') { // Evita imprimir el error 'not-authorized'
        console.error("Error en la conexión:", err);
      }
    });
    // Manejo de conexión exitosa
    this.xmpp.on("online", async () => {
      console.log("Conexión exitosa.");
      await this.xmpp.send(xml("presence",{type: "online"}));
      this.xmpp.on("stanza", async (stanza) => {
        // Maneejo de notificaciones
        if (stanza.is("message") && stanza.attrs.type == "chat"){
          // Manejo de mensajes
          const body = stanza.getChild("body");
          const from =  stanza.attrs.from;
          if (body){
            // Si contiene un body
            // Se extrae el mensaje y el usuario que lo envia
            const messageText = body.children[0];
            const sender = from.split('@')[0];
            // Se verifica si el mensaje es un archivo
            if(stanza.getChildText("filename")){
              // Si es un archivo se extrae el nombre del archivo, el contenido y el path donde se guardara
              const fileName = stanza.getChildText("filename");
              const fileData = messageText;
              const saveDir = './recived_files';
              const savePath = path.join(saveDir, fileName);
              // Se guarda el archivo en la carpeta recived_files
              await this.saveBase64ToFile(fileData, savePath);
              console.log(`\nArchivo recibido de ${sender}:`, fileName);
            }else{
              // Si no es un archivo se imprime el mensaje que envia el usuario
              console.log(`\nMensaje recibido de ${sender}:`, messageText);
            }
            
            
          }
        }
        // Manejo de solicitudes de amistad
        else if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
          // Se extrae el usuario que envia la solicitud
          const from = stanza.attrs.from;
          // Se agrega a la lista de solicitudes de amistad
          this.receivedSubscriptions.push(from);
          // Se imprime el usuario que envia la solicitud
          console.log("\nSolicitud de amistad recibida de:", from.split('@')[0]);
          console.log("Mensaje enviado:", stanza.getChildText("status"));

        } else if(stanza.is('message') && stanza.getChild('body')) {
          // Manejo de mensajes grupales
          if (stanza.attrs.type === "groupchat") {
            // Se extrae el usuario que envia el mensaje y el mensaje
            const from = stanza.attrs.from;
            const body = stanza.getChildText("body");
            // Se imprime el mensaje
            if (from && body) {
              console.log(`Mensaje de grupo: ${from}: ${body}`);
            }
          }
        }


      })
    }); 
    // Iniciar la conexión
    await this.xmpp.start().catch((err) => {
      if (err.condition !== 'not-authorized') { // Evita imprimir el error 'not-authorized'
        console.error(err);
      }
    });
  }
  /**
   * Método para verificar si el cliente está conectado al servidor XMPP.
   * @returns - una promesa que se resuelve cuando se establece la conexión.
   */
  isConnected() {
    return this.xmpp !== null && this.xmpp.status === "online";
  }
  /**
   * Método para enviar un mensaje a un destinatario.
   * @param {*} destinatario - nombre de usuario del destinatario
   * @param {*} mensaje - mensaje a enviar
   * @returns - una promesa que se resuelve cuando se envía el mensaje.
   */
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
  /**
   *  Método para enviar un mensaje a un grupo.
   * @param {*} destinatario - nombre de usuario del destinatario
   * @param {*} mensaje - mensaje a enviar
   * @returns - una promesa que se resuelve cuando se envía el mensaje.
   */
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
 
  /**
   * Método para obtener todos los contactos del usuario.
   * @returns - una promesa con los contactos del usuario.
   */
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
  /**
   * Método para obtener los detalles de un contacto.
   * @param {*} username - nombre de usuario del contacto
   * @returns - una promesa que se resuelve con los detalles del contacto que se ingresa.
   */

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
  
  /**
   * Metodo para agregar un contacto.
   * @param {*} jid - nombre de usuario del contacto
   * @returns - una promesa que se resuelve cuando se agrega el contacto.
   */
  async addContacts(jid) {

    const presence = xml("presence", {type: "subscribe", to: jid + "@alumchat.xyz"});
    this.xmpp.send(presence).then(() => {
        console.log("\nContacto agregado correctamente.");
    }).catch((err) => {
        console.error("Error when adding contact: ", err);
    });
  };
  /**
   * Metodo para invitar a un usuario a un grupo.
   * @param {*} roomName - nombre del grupo
   * @param {*} userI - nombre de usuario del contacto
   * @returns - una promesa que se resuelve cuando se envia la invitacion.
   */
  async inviteToGroupChat(roomName, userI) {
    const roomId = roomName + "@conference.alumchat.xyz";
    const inviteRequest = xml("message", {to: roomId}, xml("x", {xmlns: "http://jabber.org/protocol/muc#user"}, xml("invite", {to: userI + "@alumchat.xyz"}, xml("reason", {}, "Join the group!"))));
    await this.xmpp.send(inviteRequest);
    console.log("Invitation sent to: ", userI);
  }
  /**
   * Metodo para crear el grupo.
   * @param {*} roomName - nombre del grupo
   * @returns - una promesa que se resuelve cuando se crea el grupo.
   */
  async createGC(roomName) {
    const roomId = roomName + "@conference.alumchat.xyz";

    // If group chat is not found in the server, it will be created
    await this.xmpp.send(xml("presence", {to: roomId + "/" + this.username}));
    console.log("Joined group chat succesfully");

  }
  /**
   * Metodo para aceptar una solicitud de amistad
   * @param {*} uusario - nombre de usuario del contacto
   * @returns - una promesa que se resuelve cuando se acepta la solicitud.
   */
  async aceptarSolicitud(uusario){
    const presence = xml("presence", {type: "subscribed", to: uusario + "@alumchat.xyz"});
    this.xmpp.send(presence).then(() => {
        console.log("\nSolicitud aceptada correctamente.");
    }).catch((err) => {
        console.error("Error al agregar el contacto: ", err);
    });

  }
  /**
   * Metodo para unirse a un grupo y mandar mensajes al grupo.
   * @param {*} roomName 
   * @returns una  promesa cuando se une al grupo correctamente y ya no se desea escribir
   */
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
  /**
   * Metodo para definir el estado de presencia
   * @param {*} estado 
   * @param {*} mensaje 
   * @returns una promesa cuando se define el estado de presencia
   */
  async setPresencia(estado,mensaje) {
    const presence = xml("presence", {}, xml('show', {}, estado), xml('status', {}, mensaje));
    await this.xmpp.send(presence);
    console.log("Estado actualizado correctamente")
  }
  

  /**
   * Método para desconectarse del servidor XMPP.
   * @returns - una promesa que se resuelve cuando se desconecta del servidor.
   */
  async desconectar() {
    if (this.xmpp) {
      await this.xmpp.stop();
      this.xmpp = null;
      console.log("Desconectado del servidor XMPP.");
    }
  }
  /**
   * Funcion para enviar archivos a cualquier usuario
   * @param {*} destinatario 
   * @param {*} filePath 
   */
  async sendFile(destinatario, filePath) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }

    try{
      const file = fs.readFileSync(filePath);
      const file64 = file.toString('base64');
      const fileName = path.basename(filePath); // Obtenemos el nombre del archivo

      // console.log(fileName)
      // console.log(file64)

      const message = xml('message', { to: destinatario, type: 'chat' },
        xml('body', {}, file64), // Mensaje con el nombre del archivo
        xml('filename', {}, fileName)
      );

      // Envía el mensaje al servidor XMPP
      await this.xmpp.send(message);
    }catch(error){
      console.error("No se pudo enviar el archivo");
    }
    
  }
  /**
   * Funcion que guarda el archivo en la seccion de recived_files
   * @param {*} base64Data 
   * @param {*} filePath 
   */
  async saveBase64ToFile(base64Data, filePath) {
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFileSync(filePath, buffer);
  }
  
}


/**
 * Funcion para agarrar el input desde consola
 * @param {*} prompt - entrada
 * @returns el input del usuario.
 */
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

/**
 * Función para mostrar el menú principal de la aplicación.
 * Esta función se llama cuando se inicia la aplicación y 
 * y muestra un menu el cual cuenta con 3 opciones principales
 * que es ingresar a uan cuenta, cerar cuenta y salir de la aplicacion.
 */
async function menu() {
  console.log("Bienvenido al cliente XMPP!");
  console.log("1. Iniciar sesión");
  console.log("2. Crear cuenta");
  console.log("3. Salir");

  // Leer la opción seleccionada por el usuario
  const opcion = await leerEntrada("Seleccione una opción (1, 2 o 3): ");

  switch (opcion) {
    // Iniciar sesión
    case "1":
      const username = await leerEntrada("Ingrese su nombre de usuario: ");
      const password = await leerEntrada("Ingrese su contraseña: ");
      // Crear un nuevo cliente XMPP
      // Conectar el cliente al servidor XMPP
      const cliente = new ClienteXMPP(username, password);
      try {
        // Intentar iniciar sesion en el servidor XMPP
        await cliente.conectar();
        if(cliente.isConnected()){
          // Si la conexión es exitosa, mostrar el menú del cliente
          await menuCliente(cliente);
        }else{
          // Si no es exitosa se regresa al menu principal
          console.error("Error al iniciar sesión. Verifique sus credenciales.");
          await menu();
        }
      // Si ocurre un error, mostrar el error y regresar al menu principal
      }catch (error) {
        console.error(error);
        await menu();
      }
      break;
    // Crear cuenta
    case "2":
      // Leer el nombre de usuario y contraseña del usuario
      const newUsername = await leerEntrada("Ingrese su nuevo nombre de usuario: ");
      const newPassword = await leerEntrada("Ingrese su nueva contraseña: ");
      // Registrar el nuevo usuario en el servidor XMPP
      register(newUsername, newPassword);
      break;
    // Salir de la aplicación
    case "3":
      process.exit(0); // Salir de la aplicación con éxito

    // Opción inválida
    default:
      // Mostrar mensaje de error y regresar al menu principal
      console.log("Opción inválida. Intente nuevamente.");
      await menu();
      break;
  }
}


/**
 * Función para mostrar el menú del cliente.
 * @param {*} cliente - cliente XMPP
 * Esta función se llama cuando se inicia la aplicación y muestra todas las opciones que tiene el cliente
 * para poder interactuar con el servidor XMPP.
 * Estas son:
 * 1. Comunicacion 1 a 1
 * 2. Agregar contacto
 * 3. Mostrar detalles de contacto
 * 4. Mostrar todos los contactos y su estado
 * 5. Converssaciones grupales
 * 6. Definir mensaje de precesencia
 * 7. Eliminar cuenta
 * 8. Cerrar sesión
 * 9. Salir de la aplicación
 */
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

  // Leer la opción seleccionada por el usuario
  const opcion = await leerEntrada("Seleccione una opción: ");

  switch (opcion) {
    // Comunicacion 1 a 1
    case "1":
      // Leer el nombre de usuario del destinatario
      const destinatario = await leerEntrada("Ingrese el nombre de usuario del destinatario: ");


      // Enviar mensajes al destinatario
      let mensaje;
      // Mientras el usuario no escriba 'salir#', seguir enviando mensajes
      while (mensaje !== "salir#") {
        // Leer el mensaje del usuario
        mensaje = await leerEntrada("Escribe un mensaje (escribe 'salir#' para salir) o (escribe 'archivo#' para enviar un archivo) : ");
        if (mensaje !== "salir#") {
          if (mensaje === "archivo#") {
            // Leer el path del archivo
            const filePath = await leerEntrada("Ingrese el path del archivo: ");
            // Enviar el archivo al destinatario
            await cliente.sendFile(destinatario, filePath);

          }else{
            // Enviar el mensaje al destinatario
            await cliente.enviarMensaje(destinatario, mensaje);
          }  
        }
      }
      // Regresar al menu del cliente
      await menuCliente(cliente);
      break;
    case "2":
      // Menu de opcion para saber si desea agregar un contacto o ver las solicitudes de amistad
      console.log("1. Agregar contacto");
      console.log("2. Ver solicitudes de amistad");
      console.log("3. Salir");
      // Leer la opción seleccionada por el usuario
      const opcioncontatcto = await leerEntrada("Seleccione una opción: ");
      switch (opcioncontatcto) {
        case "1":
          // Leer el nombre de usuario del nuevo contacto
          const nuevoContacto = await leerEntrada("Ingrese el nombre de usuario del nuevo contacto: ");
          // Agregar el nuevo contacto
          await cliente.addContacts(nuevoContacto);
          // Regresar al menu del cliente
          await menuCliente(cliente);
          break;
        case "2":
          // Solicitudes de amistad
          console.log("Solicitudes de amistad");
          if (cliente.receivedSubscriptions.length === 0) {
            // Si no hay solicitudes de amistad, mostrar un mensaje
            console.log("No hay solicitudes de amistad pendientes")
            await menuCliente(cliente);
            break;

          }else{
            // Si hay solicitudes de amistad, mostrarlas
            cliente.receivedSubscriptions.forEach((subscription) => {
              console.log("Solicitud de amistad del usuario: "+ subscription.split('@')[0]);
            });
            console.log("Desea agregar alguno de los usuarios (si/no): ")
            // Leer la opción seleccionada por el usuario
            const opcionAgregar = await leerEntrada("Seleccione una opción: ");
            // Si el usuario desea agregar un contacto, leer el nombre de usuario del nuevo contacto
            if (opcionAgregar === "si") {
              // Leer el nombre de usuario del nuevo contacto
              const nuevoContacto = await leerEntrada("Ingrese el nombre de usuario del nuevo contacto: ");
              // Agregar el nuevo contacto   
              await cliente.aceptarSolicitud(nuevoContacto);
              await menuCliente(cliente);

            }
            // Si el usuario no desea agregar un contacto, regresar al menu del cliente
            else{
              await menuCliente(cliente);
              break;
            }
            
          }
        // Si el usuario desea salir, regresar al menu del cliente
        case "3":
          await menuCliente(cliente);
          break;
      }
      
    // Mostrar detalles de contacto
    case "3":
      // Leer el nombre de usuario del contacto
      const contactUsername = await leerEntrada("Ingrese el nombre de usuario del contacto: ");
      // Obtener los detalles del contacto
      const contactDetails = await cliente.getContactDetails(contactUsername);
      // Mostrar los detalles del contacto
      if (Object.keys(contactDetails).length === 0) {
        // Si no se encontraron detalles, mostrar un mensaje
        console.log("No se encontraron detalles para ese contacto.");
      } else {
        // Si se encontraron detalles, mostrarlos
        console.log("Detalles del contacto:");
        Object.entries(contactDetails).forEach(([name, details]) => {
          console.log(`Nombre: ${name}, Presencia: ${details.presence}, Suscripción: ${details.subscription}`);
        });
      }
      // Regresar al menu del cliente
      await menuCliente(cliente);
      break;
    // Mostrar todos los contactos y su estado
    case "4":
      // Obtener todos los contactos del usuario
      const contactos = await cliente.obtenerContactos();
      console.log("Tus contactos son:");
      // Mostrar los contactos
      contactos.forEach((contacto) => {
        console.log(`${contacto.name}: Presence: ${contacto.presence}, Subscription: ${contacto.subscription}`);
      });
      // Regresar al menu del cliente
      await menuCliente(cliente);
      break;
    // Converssaciones grupales
    case "5":
      // Menu de opciones para crear un grupo o unirse a un grupo
      console.log("Converssaciones grupales");
      console.log("1. Crear chat grupal");
      console.log("2. Unirse a chat grupal");
      // Leer la opción seleccionada por el usuario
      const opcion2 = await leerEntrada("Seleccione una opción: ");
      switch (opcion2) {
        // Crear chat grupal
        case "1":
          // Leer el nombre del grupo
          console.log("Crear chat grupal");
          const nombregrupo = await leerEntrada("Ingrese el nombre del grupo: ");
          // Crear el grupo
          await cliente.createGC(nombregrupo);
          console.log("Grupo creado con exito");
          // Menu de opciones para invitar a un usuario o enviar un mensaje al grupo
          console.log("\n1. Invitar a un usuario");
          console.log("2. Enviar mensaje al grupo");
          console.log("3. Salir");
          // Leer la opción seleccionada por el usuario
          const opcion3 = await leerEntrada("Seleccione una opción: ");
          switch (opcion3) {
            // Invitar a un usuario
            case "1":
              // Leer el nombre de usuario del usuario a invitar
              const invitado = await leerEntrada("Ingrese el nombre de usuario a invitar: ");
              // Invitar al usuario
              await cliente.inviteToGroupChat(nombregrupo, invitado);
              // Enviar mensaje de bienvenida al grupo
              await cliente.enviarMensajeGrupo(nombregrupo, "¡Bienvenido al grupo!")
              // Menu de opciones para invitar a otro usuario o regresar al menu del cliente
              let mensaje_agregar
              while (mensaje_agregar !== "no") {
                mensaje_agregar = await leerEntrada("¿Desea agregar otro usuario? (si/no): ");
                if (mensaje_agregar === "si") {
                  const invitado = await leerEntrada("Ingrese el nombre de usuario a invitar: ");
                  await cliente.inviteToGroupChat(nombregrupo, invitado);
                }

              }
              // Regresar al menu del cliente
              await menuCliente(cliente);
              break;
            // Enviar mensaje al grupo
            case "2":
              // Leer el mensaje a enviar
              let mensaje;
              // Mientras el usuario no escriba 'salir#', seguir enviando mensajes
              while (mensaje !== "salir#") {
                mensaje = await leerEntrada("Escribe un mensaje (escribe 'salir#' para salir): ");
                if (mensaje !== "salir#") {
                  await cliente.enviarMensajeGrupo(nombregrupo, mensaje);
                }

              }
              // Regresar al menu del cliente
              await menuCliente(cliente);
              break;
            // Regresar al menu del cliente
            case "3":
              await menuCliente(cliente);
              break

          }
          await menuCliente(cliente);
          break

        case "2":
          // Unirse a chat grupal
          console.log("Unirse a chat grupal");
          // Leer el nombre del grupo
          const nombregrupo2 = await leerEntrada("Ingrese el nombre del grupo: ");
          // Unirse al grupo
          await cliente.unierseGrupo(nombregrupo2);
          
        // Regresar al menu del cliente
        default:
          console.log("Opción inválida. Intente nuevamente.");
          await menuCliente(cliente);
          break;
      }
      break;
    // Definir mensaje de precesencia
    case "6":
      // Leer el estado y el mensaje de presencia
      const estado = await leerEntrada("Ingrese el estado: ");
      const mensajepres = await leerEntrada("Ingrese el mensaje: ");
      // Definir el estado de presencia
      await cliente.setPresencia(estado,mensajepres);
      // Regresar al menu del cliente
      await menuCliente(cliente);
      break;
    case "7":
      // Eliminar cuenta
      console.log("Eliminando cuenta");
      await cliente.deleteAccount();
      await menu();
    case "8":
      // Cerrar sesión
      if(cliente.isConnected()){
        // Si la conexión está activa, desconectarse del servidor XMPP
        await cliente.desconectar();
        console.log("¡Sesión cerrada correctamente!");
      }else{
        // Si la conexión no está activa, mostrar un mensaje
        console.log("No hay sesión activa para cerrar.");
      }
      // Regresar al menu principal
      await menu();
      break;    
    case "9":
      process.exit(0); // Salir de la aplicación con éxito
    default:
      // Mostrar mensaje de error y regresar al menu del cliente
      console.log("Opción inválida. Intente nuevamente.");
      await menuCliente(cliente);
      break;
  }
}
// Iniciar la aplicación
menu().catch((error) => {
  console.error("Error:", error);
});
