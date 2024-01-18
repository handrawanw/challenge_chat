const io = require('socket.io-client');
const rl = require("./readline");

let my_id = Buffer.from("windows").toString("base64");

const socket = io('http://localhost:8000', {
    path: '/chats',
    query: {
        username: "windows",
        password: "160104"
    }
});

const jeda = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.online_users = {};

global.pending_message = {};

socket.on('connect', async () => {
    console.log('Connected to Socket.IO server');
   
    socket.on('pong', (message) => {
        let id_chat=JSON.parse(message);
        // console.log('Terima pesan dari server');
        if (!global.online_users.hasOwnProperty(id_chat.trim())) {
            global.online_users[id_chat.trim()] = "Online";
        }
    });
    setInterval(() => {
        // console.log('Kirim ping ke server');
        socket.emit('ping');
    }, 2000); // Kirim pesan ping setiap 2 detik

    socket.emit("join_room", my_id);
    socket.emit("join_channel", "list_users", "requests_list_users");
    socket.on("notification_message", (message) => {
        console.log(message);
    })

    socket.once("online", (message) => {
        let id_chat = JSON.parse(message);
        // let username=Buffer.from(id_chat.trim(),"base64").toString("utf-8");
        // console.log(`${username} Online`);
        // braodcast pesan yang pending ke user
        if (global.pending_message.hasOwnProperty(id_chat.trim())) {
            socket.emit("notification", id_chat.trim(), `${global.pending_message[id_chat.trim()].length} Pesan masuk dari`);
            for (let chat of global.pending_message[id_chat.trim()]) {
                socket.emit("join_channel", id_chat.trim(), chat);
                // console.log("Sent to ", id_chat.trim());
            }
            console.log("\n");
            // clear pending message
            delete global.pending_message[id_chat.trim()];
        }
        if (!global.online_users.hasOwnProperty(id_chat.trim())) {
            global.online_users[id_chat.trim()] = "Online";
        }
    })
    socket.once("offline", (message) => {
        let id_chat = JSON.parse(message);
        // let username=Buffer.from(id_chat.trim(),"base64").toString("utf-8");
        // console.log(`${username} Offline`);
        if (global.pending_message.hasOwnProperty(id_chat.trim())) {
            // clear pending message
            delete global.pending_message[id_chat.trim()];
        }
        if (global.online_users.hasOwnProperty(id_chat.trim())) {
            // clear pending message
            delete global.online_users[id_chat.trim()];
        }
    })
    socket.on("message", (message) => {
        console.log(message);
    })
});

(async () => {
    while (true) {
        console.log("\n");
        await jeda(1000);
        console.log("MY ID CHAT ", my_id.trim());
        console.log("Anda sedang ", socket.connected ? "Online" : "Offline")
        console.log(`===============\nSilakan pilih menu\n1. Chat Users\n2. Disconnect to server (Mode Offline)\n3. Connected to server (Mode Online)\n999. Exit App\n===============`);
        let menu = await rl.ask("Silakan pilih menu\n");
        console.log("Anda memilih menu : ", menu.trim());
        if (menu == "1") {
            let id_chat = await rl.ask("Masukan ID Chat\n");
            // example d2luZG93cw==
            let message_chat = await rl.ask("Masukan messages\n");
            let my_username = Buffer.from(my_id.trim(), 'base64').toString("utf-8");
            let username = Buffer.from(id_chat.trim(), 'base64').toString("utf-8");
            console.log("Pesan dikirim ke ", username);
            await jeda(500);
            if (socket.connected) {
                console.log(
                    Buffer.from(id_chat.trim(), "base64").toString("utf-8"),
                    " Sedang ",
                    global.online_users.hasOwnProperty(id_chat.trim()) ? "online" : "offline"
                );
            } else {
                console.log("Anda sedang Offline")
            }
            if (global.online_users.hasOwnProperty(id_chat.trim())) {
                // jika user online maka pending pesan dikirim ke penerima
                socket.emit("notification", id_chat.trim(), `Pesan masuk dari ${my_username}`);
                socket.emit("join_channel", id_chat.trim(), `${my_username} "${message_chat}"`);
            } else {
                // jika user offline maka pesan disimpan ke variabel pending_message
                console.log("Pesan disimpan");
                if (!global.pending_message.hasOwnProperty(id_chat.trim())) {
                    global.pending_message[id_chat.trim()] = [];
                }
                global.pending_message[id_chat.trim()].push(`${my_username} : ${message_chat}`);
            }
        } else if (menu == "2") {
            socket.disconnect();
        } else if (menu == "3") {
            socket.connect();
        } else if (menu == "999") {
            console.log("Exit..");
            process.exit();
        }
    }
})();

socket.on('connect_error', (error) => {
    console.error('Connection Error:', error.message);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
});


process.on('SIGINT', () => {
    socket.disconnect();
    console.log('Disconnected and exiting...');
    process.exit();
});
