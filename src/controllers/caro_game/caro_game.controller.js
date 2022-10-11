//model
const {RoomGame,Player} = require('../../models')

caroGameInitConnection =(socket , socketManager) =>{
    console.log('connect socket');
    //create a room
    socket.on('createRoom', async ({ nickname }) => {
        console.log(nickname);
        try {
            let room = new RoomGame();
            let player = {
                socketID: socket.id,
                nickName: nickname,
                playerType: 'x'
            };
            room.players.push(player);
            room.turn = player;
            room.code = (Math.random() + 1).toString(36).substring(6);
            room = await room.save();
            const roomId = room._id.toString();

            console.log(room);

            socket.join(roomId);

            socketManager.to(roomId).emit('createRoomSuccess', room);

        } catch (ex) {
            Console.log(ex);
        }

    });

    //join room
    socket.on('joinRoom', async ({ nickname, roomId }) => {
        console.log(`nickname : ${nickname} , roomId : ${roomId}`);
        try {
            if (!roomId.match(/^[0-9a-fA-F]{24}$/)) {
                socket.emit('errorOccurred', 'Please enter a valid room ID.')
                return;
            }
            let room = await RoomGame.findById(roomId);
            if (room.isJoin) {
                let player = {
                    socketID: socket.id,
                    nickName: nickname,
                    playerType: 'o'
                };
                room.players.push(player);
                room.isJoin = false;
                room = await room.save();

                socket.join(roomId);

                console.log(room);

                socketManager.to(roomId).emit('joinRoomSuccess', room);
                socketManager.to(roomId).emit('updatePlayers', room.players);
                socketManager.to(roomId).emit('updateRoom', room);

            } else {
                socket.emit('errorOccurred', 'The game is in progress, try again later.')
            }
        } catch (ex) {
            console.log(ex);
        }
    });

    //tap grid
    socket.on('tap', async ({ index, roomId }) => {
        try {
            let room = await RoomGame.findById(roomId);
            let choice = room.turn.playerType;

            if (room.turnIndex == 0) {
                room.turnIndex = 1;
                room.turn = room.players[1];
            } else {
                room.turnIndex = 0;
                room.turn = room.players[0];
            }
            room = await room.save();

            socketManager.to(roomId).emit('tapped', { index, room, choice })
        } catch (ex) {
            console.log(ex);
        }
    });

    //winner round
    socket.on('winner', async ({ roomId, socketID }) => {
        try {
            let room = await RoomGame.findById(roomId);
            let player = room.players.find((p) => p.socketID == socketID);
            player.points += 1;
            room.round += 1;
            room = await room.save();

            if (room.maxRound <= player.points) {
                socketManager.to(roomId).emit('endGame', player);
            } else {
                socketManager.to(roomId).emit('increasePointPlayer', player);
            }
        } catch (ex) {
            console.log(ex);
        }
    });

};
module.exports = {caroGameInitConnection};