module.exports = function(client, roomId, args) {
    let stepSize = args[0] || 1;
    let subtractBy = args[1] || 0;

    let room = client.getRoom(roomId);
    if (!room) return null;

    let steps = (room.getJoinedMembers().length - subtractBy) / stepSize;
    let count = Math.floor(steps) * stepSize;

    return {'$RESULT': count};
};