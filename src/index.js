import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import {Server} from 'socket.io';
import Filter from 'bad-words';
import {generateMessage, generateLocationMessage} from './utils/messages.js';
import {addUser, removeUser, getUser, getUsersInRoom} from './utils/users.js';

const app = express();
const server = http.createServer(app); // refactor，不讓express library在背後執行
const io = new Server(server);

const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

let count = 0;

// server (emit) -> client (receive) -- countUpdated
// client (emit) -> server (receive) -- increment

// on()用來監聽事件
// io.on()是web socket用來處理連線事件，名稱'connection'
io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    
    socket.on('join', (options, callback) => {
        const {error, user} = addUser({id:socket.id, ...options}); // ...options = {username, room}
        if(error){
            return callback(error);
        }
        socket.join(user.room);

        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)); // 廣播給除了自己的user
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        // socket.emit, io.emit, socket.broadcast.emit
        //              io.to.emit, socket.broadcast.to.emit

        callback();
    })
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message)); // 廣播給所有人，包含自己
        callback();
    })
    socket.on('sendLocation', ({lat, long}, callback) => {
        const user = getUser(socket.id);
        const url = `https://google.com/maps?q=${lat},${long}`;
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url));
        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`)); // 自己離開了，沒差
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    })
})
// io是client端與server端的連結
// socket是client端操作和server溝通的端點

server.listen(port, () => {
    console.log('Server is up on port ' + port);
});