const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const ADMIN_NAME = "UBOCKA";

let users = [];

io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('login', (name) => {
    if(users.find(u => u.name.toLowerCase() === name.toLowerCase())) {
      socket.emit('loginError', 'Ник уже используется');
      return;
    }
    currentUser = {id: socket.id, name, banned: false, admin: (name === ADMIN_NAME)};
    users.push(currentUser);
    socket.emit('loginSuccess', {name: currentUser.name, id: socket.id, admin: currentUser.admin});
    io.emit('userList', users.map(u => ({name: u.name, admin: u.admin, banned: u.banned, id: u.id})));
    console.log(`${name} вошёл.`);
  });

  socket.on('message', ({chatId, text}) => {
    if(!currentUser || currentUser.banned) {
      socket.emit('banned');
      return;
    }
    const receiver = users.find(u => u.id === chatId);
    if(receiver){
      io.to(receiver.id).emit('message', {chatId: currentUser.id, user: currentUser.name, text});
      socket.emit('message', {chatId: receiver.id, user: currentUser.name, text});
    } else {
      socket.emit('errorMsg', 'Пользователь не найден или не онлайн');
    }
  });

  socket.on('banUser', (nameToBan) => {
    if(!currentUser || !currentUser.admin) return;
    users.forEach(u => {
      if(u.name.toLowerCase() === nameToBan.toLowerCase()){
        u.banned = !u.banned;
        io.to(u.id).emit('banned', u.banned);
      }
    });
    io.emit('userList', users.map(u => ({name: u.name, admin: u.admin, banned: u.banned, id: u.id})));
  });

  socket.on('disconnect', () => {
    if(currentUser){
      users = users.filter(u => u.id !== currentUser.id);
      io.emit('userList', users.map(u => ({name: u.name, admin: u.admin, banned: u.banned, id: u.id})));
      console.log(`${currentUser.name} вышел.`);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
