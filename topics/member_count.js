module.exports = function(client, roomId, args) {
    let subtractBy = args[0] || 0;

    let room = client.getRoom(roomId);
    if (!room) return null;

    return {'$RESULT': room.getJoinedMembers().length - subtractBy};
};