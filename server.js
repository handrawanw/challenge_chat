const express = require("express");
const app = express();
const { Server } = require("socket.io");
const http = require("http");

// database local file .json
const account = require("./account.json");

const PORT = process.env.PORT || 8000;

// register request form 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// register request form

// cors
const cors = require("cors");
app.use(cors("*"));
// cors

// helmet
const helmet = require("helmet");
app.use(helmet());
app.use(helmet.hidePoweredBy("PHP 7.2.0"))
// helmet

global.users={};

const server = http.createServer(app);
const IO = new Server(server, {
    path: "/chats",
    allowEIO3: true,
    cors: {
        origin: ["*"],
        methods: ["GET", "POST"],
        credentials: true,
    }
});

IO.use((socket, next) => {
    const username = socket.handshake.query.username || null;
    const password = socket.handshake.query.password || null;
    const token=Buffer.from(username).toString("base64");
    let cek_account=account.find((item)=>item.username==username&&item.password==password);
    if (username && password && cek_account) {
        if(global.users.hasOwnProperty(token)){
            return next(new Error(`Akun ini telah login ${token}`));
        }else{
            global.users[token]={
                id:cek_account.id,
                username:cek_account.username
            };
            socket.user={
                id:cek_account.id,
                username:cek_account.username
            };
            socket.user_token=token;
            return next(); // Auth sukses
        }
    } else {
        return next(new Error('Authentication failed'));
    }
});

IO.on("connection", (socket) => {
    const token = socket.user_token || null;

    // broadcast to all users
    for(let id_chat of Object.keys(global.users)){
        IO.to(id_chat.trim()).emit("online",JSON.stringify(token));
    }

    socket.on('ping', () => {
        // Mengirim pesan pong sebagai respons
        socket.emit('pong',JSON.stringify(socket.user_token));
    });

    console.log("Client connected ", socket.id, socket.user.username);
    console.log("Token user ",token);
    socket.join(token);

    socket.on("join_room",(room)=>{
        socket.join(room);
    });

    socket.on("notification", (room, message) => {
        IO.to(room).emit("notification_message", message);
    });

    socket.on("join_channel", (room, message) => {
        IO.to(room).emit("message", message);
    });

    socket.on('disconnect', () => {
        // destroy login
        const token=socket.user_token;

          // broadcast to all users
        for(let id_chat of Object.keys(global.users)){
            IO.to(id_chat.trim()).emit("offline",JSON.stringify(token));
        }

        socket.leave(token);
        console.log("Client disconnected ", socket.id, socket.user.username);
        delete users[token];
    });

});

server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`Server is running ${PORT}`);
});
