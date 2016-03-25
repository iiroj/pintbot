# Pint Bot

>🍻 My function is to guide you to a pint of beer. Please send me your 📍location to start. 
>
> __/pub__ _Get pub suggestions, or information about a specific pub_  
> __/location__ _Get your current saved location, or set a new geocodable location_  
> __/clear__ _Clear your saved location_  
> __/help__ _Show brief help message_

Pint Bot is a [Telegram](https://telegram.org) [bot](https://core.telegram.org/bots) powered by [Node.js](https://nodejs.org/en/) that uses the [Foursquare](https://foursquare.com) [API](https://developer.foursquare.com) to find pubs based on the user's location. Location can be set either by sending Pint Bot a location message, or by supplying it with a geocodable location description.

Pint Bot is constantly under development and the latest version can be found on Telegram:

# [Telegram: Contact @pintbot](https://telegram.me/pintbot)

## Technology

Pint Bot runs in a [Node.js](https://nodejs.org/en/) backend that [nginx](http://nginx.org) proxies requests to. Here's a brief overview of the server's files and what they do:

### main.js

The startup file for Pint Bot. It requires the _http server— and the _bot backend_.

### server.js

The _HTTP Server_ for Pint Bot. A [Connect](https://github.com/senchalabs/connect) server is listening on port 8443, where [nginx](http://nginx.org) proxies requests to. [Body-parser]() then parses the request bodies to JSON and passes them on to the _bot backend_.

### pintbot.js

The _bot backend_. _pintbot.js_ initializes both the Foursquare API and the Telegram Bot API. _pintbot.js_ then receives requests from _server.js_ and responds according to the message content.

### config.js

The configuration file contains the keys for both the Telegram bot and Foursquare APIs. An example file is provided.

### locations.json

The key-value store for _pintbot.js_ that uses [node-dirty](https://github.com/felixge/node-dirty) to save the users' last-known locations. locations.json contains key-values in the format `{key: userId, value: location}`, where `location` is either coordinate object `{lat: X, lng: Y}` or a geocodable description such as `Helsinki, Finland`.

## Licence

Pint Bot is licenced under the GNU General Public License, version 2. Please refer to the file [LICENCE](https://github.com/iiroj/pintbot/blob/master/LICENCE) in this project.
