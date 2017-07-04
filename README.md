# matrix-topic-bot

[![Greenkeeper badge](https://badges.greenkeeper.io/turt2live/matrix-topic-bot.svg)](https://greenkeeper.io/)
[![TravisCI badge](https://travis-ci.org/turt2live/matrix-topic-bot.svg?branch=master)](https://travis-ci.org/turt2live/matrix-topic-bot)
[![Targeted for next release](https://badge.waffle.io/turt2live/matrix-topic-bot.png?label=sorted&title=Targeted+for+next+release)](https://waffle.io/turt2live/waffle-matrix?utm_source=badge)
[![WIP](https://badge.waffle.io/turt2live/matrix-topic-bot.png?label=wip&title=WIP)](https://waffle.io/turt2live/waffle-matrix?utm_source=badge)

A simple bot that keeps your Matrix room's dynamic topic up to date.

Questions? Ask away in [#topicbot:t2bot.io](https://matrix.to/#/#topicbot:t2bot.io)

# Usage

1. Invite `@topic:t2bot.io` to a room
2. Give the bot permission to edit your topic (usually requires moderator privileges)
3. Set your topic formatter and variables: `!topic format member_count`
4. Set your desired room topic: `!topic set My first room with {RESULT} people!`
5. The bot will keep your topic up to date!

For information on the available formatters, type `!topic formats` or `!topic help` for more information.

# Building your own

*Note*: You'll need to have access to an account that the bot can use to get the access token.

1. Clone this repository
2. `npm install`
3. Copy `config/default.yaml` to `config/production.yaml`
4. Edit the values of `config/production.yaml` and `config/database.json` to match your needs
5. Run the bot with `NODE_ENV=production node index.js`
