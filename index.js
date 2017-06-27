const config = require("config");
const sdk = require("matrix-js-sdk");
const _ = require('lodash');
const escapeStringRegexp = require("escape-string-regexp");

const client = sdk.createClient({
    baseUrl: config['homeserverUrl'],
    accessToken: config['accessToken'],
    userId: config['userId']
});

const topicCache = {}; // roomId: topic

client.on('event', event => {
    if (event.getType() !== "m.room.member") return;
    if (event.getStateKey() === client.credentials.userId) {
        handleSelfMembership(event);
    }

    checkTopic(event.getRoomId());
});

function handleSelfMembership(event) {
    if (event.getContent().membership !== 'invite') return;
    client.joinRoom(event.getRoomId());
}

function checkTopic(roomId) {
    let template = config['rooms'][roomId];
    if (!template) return;

    let vars = {};
    if (template['fn']) {
        vars = require(template['fn'])(client, roomId, template['args']);
    }

    let topicTemplate = template['topic'];

    if (vars) {
        for (let key of _.keys(vars)) {
            topicTemplate = topicTemplate.replace(new RegExp(escapeStringRegexp(key)), vars[key]);
        }
    }

    let room = client.getRoom(roomId);
    let topic = room.currentState.getStateEvents('m.room.topic', '');
    if (!topic || !topic.getContent() || topic.getContent().topic !== topicTemplate) {
        if (topicCache[roomId] === topicTemplate)
            return;

        console.log("Updating topic in room " + roomId);

        let originalCachedValue = topicCache[roomId];
        topicCache[roomId] = topicTemplate;
        client.setRoomTopic(roomId, topicTemplate).catch(err => topicCache[roomId] = originalCachedValue).then(() => console.log("Topic updated in room " + roomId)).catch(err => {
            console.log("Failed to update topic in room " + roomId);
            console.error(err);
        });
    }
}

client.startClient();