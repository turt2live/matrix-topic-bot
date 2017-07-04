const htmlToText = require('html-to-text');
const providers = require('./providers');
const TopicStore = require('./TopicStore');
const TopicHandler = require("./TopicHandler");
const _ = require('lodash');

class CommandHandler {
    start(client) {
        this._client = client;

        client.on('event', (event) => {
            if (event.getType() !== 'm.room.message') return;
            if (event.getSender() === client.credentials.userId) return;
            if (event.getContent().msgtype !== 'm.text') return;
            if (!event.getContent().body.startsWith("!topic")) return;

            this._processCommand(event);
        });
    }

    _processCommand(event) {
        var parts = event.getContent().body.substring("!topic ".length).split(" ");

        var promise = null;

        if (parts[0] === "provider") {
            if (parts[1] === "add" || parts[1] === "update") {
                promise = () => this._addUpdateProvider(event.getRoomId(), parts[2], parts.splice(3));
            } else if (parts[1] === "remove") {
                promise = () => this._removeProvider(event.getRoomId(), parts[2]);
            } else if (parts[1] === "list") {
                promise = () => this._listProviders(event.getRoomId());
            } else if (parts[1] === "configured") {
                promise = () => this._showProviders(event.getRoomId());
            }
        } else if (parts[0] === "set") {
            promise = () => this._setTopic(event.getRoomId(), parts.splice(1).join(" "));
        }

        if (promise !== null) {
            if (!this._hasPermission(event.getSender(), event.getRoomId())) {
                this._client.sendNotice(event.getRoomId(), "You do not have permission to use that command here.");
                return;
            } else {
                promise();
                return;
            }
        }

        // if we made it this far, send help
        var message = "Topic bot help:<br>" +
            "<code>!topic help</code> - This menu<br>" +
            "<code>!topic set &lt;topic&gt;</code> - Sets the topic for the room<br>" +
            "<code>!topic provider list</code> - Lists all available providers<br>" +
            "<code>!topic provider add &lt;provider&gt; [arguments]</code> - Adds a provider for the room's topic calculation<br>" +
            "<code>!topic provider update &lt;provider&gt; [arguments]</code> - Updates a provider for the room's topic calculation<br>" +
            "<code>!topic provider remove &lt;provider&gt;</code> - Removes a provider from the topic calculation<br>" +
            "<code>!topic provider configured</code> - Shows the providers (and their settings) configured for this room<br>";
        var plainMessage = htmlToText.fromString(message);
        this._client.sendHtmlNotice(event.getRoomId(), plainMessage, message);
    }

    _hasPermission(sender, roomId) {
        var room = this._client.getRoom(roomId);
        var powerLevels = room.currentState.getStateEvents('m.room.power_levels', '');
        if (!powerLevels) return false;
        powerLevels = powerLevels.getContent();

        var userPowerLevels = powerLevels['users'] || {};
        var eventPowerLevels = powerLevels['events'] || {};

        var powerLevel = userPowerLevels[sender];
        if (!powerLevel) powerLevel = powerLevels['users_default'];
        if (!powerLevel) powerLevel = 0; // default

        var topicPowerLevel = eventPowerLevels["m.room.topic"];
        if (!topicPowerLevel) topicPowerLevel = powerLevels["state_default"];
        if (!topicPowerLevel) return false;

        return topicPowerLevel <= powerLevel;
    }

    _setTopic(roomId, topic) {
        var conf = TopicStore.getTopicInfo(roomId);

        conf.topic = topic;

        TopicStore.setTopicInfo(roomId, conf);
        this._client.sendNotice(roomId, "Topic configuration updated");
        TopicHandler.checkTopic(roomId);
    }

    _addUpdateProvider(roomId, provider, providerArgs) {
        if (!providers[provider]) {
            this._client.sendNotice(roomId, "Provider '" + provider + "' does not exist.");
            return;
        }

        var conf = TopicStore.getTopicInfo(roomId);
        var toRemove = [];
        for (var existingProvider of conf.providers) {
            if (existingProvider.name === provider) {
                toRemove.push(existingProvider);
            }
        }

        for (var providerToDelete of toRemove) {
            var idx = conf.providers.indexOf(providerToDelete);
            if (idx !== -1) conf.providers.splice(idx, 1);
        }

        conf.providers.push({name: provider, args: providerArgs});
        TopicStore.setTopicInfo(roomId, conf);
        this._client.sendNotice(roomId, "Topic configuration updated");
        TopicHandler.checkTopic(roomId);
    }

    _removeProvider(roomId, provider) {
        if (!providers[provider]) {
            this._client.sendNotice(roomId, "Provider '" + provider + "' does not exist.");
            return;
        }

        var conf = TopicStore.getTopicInfo(roomId);
        var toRemove = [];
        for (var existingProvider of conf.providers) {
            if (existingProvider.name === provider) {
                toRemove.push(existingProvider);
            }
        }

        for (var providerToDelete of toRemove) {
            var idx = conf.providers.indexOf(providerToDelete);
            if (idx !== -1) conf.providers.splice(idx, 1);
        }

        TopicStore.setTopicInfo(roomId, conf);
        this._client.sendNotice(roomId, "Topic configuration updated");
        TopicHandler.checkTopic(roomId);
    }

    _showProviders(roomId) {
        var conf = TopicStore.getTopicInfo(roomId);

        if (conf.providers.length === 0) {
            this._client.sendNotice(roomId, "No providers configured.");
            return;
        }

        var message = "";
        for (var provider of conf.providers) {
            var knownProvider = providers[provider.name];
            message += "<strong>" + provider.name + "</strong> ";

            var i = 0;
            for (var arg of knownProvider.inputs) {
                var val = provider.args[i];
                if (val === null || val === undefined) val = arg.def;
                if (val === null || val === undefined) val = "<i>not provided</i>";

                message += arg.placeholder + " = " + val + "&nbsp;&nbsp;";
                i++;
            }

            message += "<br>";
        }

        var plainMessage = htmlToText.fromString(message);
        this._client.sendHtmlNotice(roomId, plainMessage, message);
    }

    _listProviders(roomId) {
        var message = "";
        for (var provider of _.values(providers)) {
            message += "<strong>" + provider.name + "</strong> - " + provider.description + "<br>";

            var helpString = "!topic provider add " + provider.name + " " + _.map(provider.inputs, i => i.placeholder).join(" ");

            message += "&nbsp;&nbsp;&nbsp;&nbsp;<code>" + helpString.trim() + "</code><br>";

            if (provider.inputs.length > 0) {
                message += "<ul>";
                _.forEach(provider.inputs, i => {
                    message += "<li>" + i.placeholder + " - " + i.description + "</li>";
                });
                message += "</ul>";
            }

            if (_.keys(provider.outputs).length > 0) {
                message += "&nbsp;&nbsp;&nbsp;&nbsp;<i>Output Variables</i><br><ul>";
                _.forEach(_.keys(provider.outputs), outputVar => {
                    message += "<li>" + outputVar + " - " + provider.outputs[outputVar] + "</li>";
                });
                message += "</ul>";
            }

            message += "<hr>";
        }

        message = message.substring(0, message.length - 4); // trim off the last <hr>

        var plainMessage = htmlToText.fromString(message);
        this._client.sendHtmlNotice(roomId, plainMessage, message);
    }
}

module.exports = new CommandHandler();