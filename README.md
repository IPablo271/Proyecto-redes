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

## Usage

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
