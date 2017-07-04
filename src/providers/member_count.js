module.exports = {
    name: 'member_count',
    description: 'Provides a variable for the number of people in the room',
    inputs: [
        {placeholder: '[subtract by]', description: 'The number of people to not include in the room count. Default is 0', def: 0},
        {placeholder: '[step size]', description: 'The number of people required to cause an update. Default is 1', def: 1},
    ],
    outputs: {
        '$memberCount': 'The number of members in the room, as per the calculations'
    },
    format: function (client, roomId, args) {
        let subtractBy = args[0] || 0;
        let stepSize = args[1] || 1;

        let room = client.getRoom(roomId);
        if (!room) return null;

        let steps = (room.getJoinedMembers().length - subtractBy) / stepSize;
        let count = Math.floor(steps) * stepSize;

        return {'$memberCount': count};
    }
};