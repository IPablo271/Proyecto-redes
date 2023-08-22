# XMPP Chat Client
This project is a chat client developed in JavaScript using the @xmpp/client library. It allows users to log in to an XMPP server, create accounts, send individual and group messages, manage contacts, set presence states, and more. The client runs in the command line and provides an interactive user interface to perform these actions. It connects to an XMPP server (alumchat.xyz) and uses XMPP protocols for communication and contact management. The code implements multiple features such as logging in, adding contacts, joining group chats, setting presence states, deleting accounts, and more.

## Features
### Account Administration
1. Login: Log in to the XMPP server using your credentials.
2. User registration: Create a new XMPP account on the server.
3. Account deletion: Delete your XMPP account from the server.
4. Logout: Logout of the account that is in use.

### Communication between accounts
1. 1 on 1 communication between any user.
2. Add contacts to user's contacts.
3. Show details of an specific contact
4. Show details of all contacts.
5. Group chatting between users
6. Setting a presence message and status
7. Receive and send notifications

## Prerequisites
- node v16.15.^
## Dependencies
- @xmpp/client ^0.13.1
- @xmpp/debug ^0.13.0
- net ^1.0.2
- fs ^0.0.1
- path ^0.12.7

## Usage

Clone the Repository to your local machine via
```
git clone https://github.com/IPablo271/Proyecto-redes.git
```
Please ensure that you have Node.js installed by using the following command:
```
node -v
```
In the command line, inside the directory, install the dependencies via
```
npm i
```
Run the project via

```
node client.js
```

After running node client.js, you will encounter the menus based on your interactions.

```
Bienvenido al cliente XMPP!
1. Iniciar sesión
2. Crear cuenta
3. Salir
Seleccione una opción (1, 2 o 3): 1
```
```
Conexión exitosa.
1. Comunicacion 1 a 1
2. Agregar contacto
3. Mostrar detalles de contacto
4. Mostrar todos los contactos y su estado
5. Converssaciones grupales
6. Definir mensaje de precesencia
7. Eliminar cuenta
8. Cerrar sesión
9. Salir de la aplicación
Seleccione una opción:
```

## Author
👤 Pablo Gonzalez

If you have any questions or would like to get in touch, feel free to send me an email at:

Email: pablogonzalez2716@gmail.com

I'll be more than happy to assist you with any inquiries you may have about the XMPP Client Application.
