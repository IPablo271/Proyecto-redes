const { client, xml } = require("@xmpp/client");

async function login(username, password) {
  const xmpp = client({
    service: "xmpp://alumchat.xyz",
    domain: "alumchat.xyz",
    resource: "example",
    username: username,
    password: password,
  });

  xmpp.on("error", (err) => {
    console.error(err);
  });

  xmpp.on("offline", () => {
    console.log("Desconectado");
  });

  xmpp.on("stanza", async (stanza) => {
    if (stanza.is("message")) {
      console.log(`Mensaje entrante: ${stanza.getChildText("body")}`);
    }
  });

  xmpp.on("online", async (address) => {
    console.log(`Conectado como ${address}`);
    await xmpp.send(xml("presence"));
  });

  try {
    await xmpp.start();
  } catch (err) {
    if (err.condition === "not-authorized") {
      throw new Error("Error: No estás autorizado para iniciar sesión.");
    } else {
      throw err;
    }
  }

  return xmpp;
}

// Reemplaza estos valores con tus credenciales
const username = "tu_nombre_de_usuario";
const password = "tu_contraseña";

async function main() {
  try {
    const xmpp = await login(username, password);
    console.log("Conectado exitosamente al servidor XMPP.");
  } catch (err) {
    console.error(err);
  }
}

main();
