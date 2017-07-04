const LogService = require("./LogService");
const TopicStore = require("./TopicStore");
const providers = require("./providers");
const escapeStringRegexp = require("escape-string-regexp");
const moment = require("moment");
const htmlToText = require("html-to-text");
const _ = require("lodash");

class TopicHandler {

    constructor() {
        this._topicCache = {}; // { roomId: topic }
        this._lastWarned = {}; // { roomId: moment }
    }

    start(client) {
        this._client = client;

        client.on('event', event => {
            if (event.getStateKey() === this._client.credentials.userId) return;
            if (event.getSender() === this._client.credentials.userId) return;

            // If we're not looking at an event we sent, try and update the room topic
            this.checkTopic(event.getRoomId());
        });
    }

    checkTopic(roomId) {
        if (!roomId) return;

        LogService.info("TopicHandler", "Checking topic for room " + roomId);
        var roomConf = TopicStore.getTopicInfo(roomId);

        if (!roomConf || !roomConf.topic) {
            LogService.info("TopicHandler", "No topic configured for room " + roomId);
            return;
        }

        var topic = roomConf.topic;

        for (var provider of roomConf.providers) {
            if (!providers[provider.name]) {
                LogService.warn("TopicHandler", "Room " + roomId + " has provider " + provider.name + " which does not exist - skipping");
                continue;
            }

            var results = providers[provider.name].format(this._client, roomId, provider.args);
            if (results) {
                for (var key of _.keys(results)) {
                    topic = topic.replace(new RegExp(escapeStringRegexp(key)), results[key]);
                }
            }
        }

        let room = this._client.getRoom(roomId);
        let topicEvent = room.currentState.getStateEvents('m.room.topic', '');
        if (!topicEvent || !topicEvent.getContent() || topicEvent.getContent().topic !== topic) {
            if (this._topicCache[roomId] === topic) {
                LogService.info("TopicHandler", "Topic unchanged in " + roomId);
                return;
            }

            LogService.info("TopicHandler", "Updating topic in room " + roomId);

            let originalCachedValue = this._topicCache[roomId];
            this._topicCache[roomId] = topic;
            this._client.setRoomTopic(roomId, topic)
                .catch(err => {
                    this._topicCache[roomId] = originalCachedValue;
                    return Promise.reject(err);
                })
                .then(() => LogService.info("TopicHandler", "Topic updated in room " + roomId))
                .catch(err => {
                    LogService.error("TopicHandler", "Failed to update topic in room " + roomId);
                    LogService.error("TopicHandler", err);

                    if (err.message && err.message.startsWith("You don't have permission to post that to the room.")) {
                        if (this._lastWarned[roomId] && moment().isBefore(this._lastWarned[roomId].add(5, 'minutes')))
                            return;

                        var message = "<font color='#00B4BD'>I do not have permission to change your room's topic. Please grant me permission in the room settings or kick me from the room.</font>"
                        var plainMessage = htmlToText.fromString(message);
                        this._client.sendHtmlNotice(roomId, plainMessage, message);
                        this._lastWarned[roomId] = moment();
                    }
                });
        } else LogService.info("TopicHandler", "Topic unchanged in " + roomId);
    }
}

module.exports = new TopicHandler();