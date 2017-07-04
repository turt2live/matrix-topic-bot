const LocalStorage = require("node-localstorage").LocalStorage;
const LogService = require("./LogService");

class TopicStore {

    constructor() {
        LogService.info("TopicStore", "Initializing localstorage backend");
        this._store = new LocalStorage("./db");
    }

    /**
     * Gets the topic information for a room
     * @param {string} roomId the room ID to lookup
     * @returns {{topic: string, providers: {name:string, args: string[]}[]}}
     */
    getTopicInfo(roomId) {
        return this._prefillObject(JSON.parse(this._store.getItem(roomId) || "{}"));
    }

    /**
     * Sets the topic information for a room
     * @param {string} roomId the room ID
     * @param {{topic: string, providers: {name:string, args: string[]}[]}} topicInfo the new topic information
     */
    setTopicInfo(roomId, topicInfo) {
        this._store.setItem(roomId, JSON.stringify(topicInfo || {}));
    }

    _prefillObject(obj) {
        if (!obj) obj = {};
        if (!obj.providers) obj.providers = [];
        return obj;
    }
}

module.exports = new TopicStore();