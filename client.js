const net = require('net');

const serverHost = 'alumchat.xyz';
const serverPort = 5222;

let client; // Variable para mantener la conexión TCP

function inicioSesion(jid, password) {
  // Conexión TCP
  client = net.connect({ host: serverHost, port: serverPort }, () => {
    console.log('Conexión establecida con el servidor.');

    // Envío del inicio de sesión
    const xmlAuth = `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">${Buffer.from(`${jid}\x00${jid}\x00${password}`).toString('base64')}</auth>`;
    client.write(xmlAuth);

    // Envío del inicio de la secuencia XML
    const xmlStream = `<?xml version="1.0" encoding="UTF-8"?><stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" to="${serverHost}" version="1.0">`;
    client.write(xmlStream);
  });

  // Evento que se dispara cuando se recibe data del servidor.
  client.on('data', (data) => {
    console.log('Datos recibidos del servidor:', data.toString());

    // Aquí puedes analizar las respuestas del servidor XMPP y tomar acciones en consecuencia.

    // Cerrar la conexión después de recibir una respuesta (opcional).
    // client.end();
  });

  // Evento que se dispara cuando hay un error en la conexión.
  client.on('error', (error) => {
    console.error('Error en la conexión:', error);
    // Aquí podrías agregar lógica para manejar el error adecuadamente.
  });
}

function enviarMensaje(destinatarioJID, mensaje) {
  // Comprobar si la conexión TCP ya está establecida
  if (!client || !client.writable) {
    console.error('Error: No se ha establecido una conexión con el servidor.');
    return;
  }

  // Construir el mensaje XMPP
  const xmlMessage = `<message from="${jid}" to="${destinatarioJID}" type="chat"><body>${mensaje}</body></message>`;
  client.write(xmlMessage);
}

// Ejemplo de inicio de sesión con una cuenta JID y contraseña.
const jid = 'gon20362@alumchat.xyz';
const password = '1234';

// Iniciar sesión y enviar un mensaje de prueba
inicioSesion(jid, password);

// Ejemplo de enviar un mensaje a otro usuario
const destinatarioJID = 'her20053@alumchat.xyz';
const mensaje = '¡Hola! Este es un mensaje de prueba.';
enviarMensaje(destinatarioJID, mensaje);
