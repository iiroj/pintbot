# Pint Bot

>🍻 My function is to guide you to a pint of beer. Please send me your 📍location to start. 
>
> __/suggest__ _Get pub suggestions_  
> __/location__ _Update your saved location, eg. "Helsinki"_  
> __/clear__ _Clear your saved location_  
> __/help__ _Show brief help message_
> 
> [About Pint Bot](https://github.com/iiroj/pintbot)

Pint Bot was a [Telegram](https://telegram.org) [bot](https://core.telegram.org/bots) powered by [Node.js](https://nodejs.org/en/) that used the [Google Places API](https://developers.google.com/places/) to find pubs based on the user's location. Location could be set either by sending Pint Bot a location message, or by supplying it with a geocodable location description.

The canonical repository for this project is at [gitlab:iiroj/pintbot](https://gitlab.com/iiroj/pintbot). It is mirrored at [github:iiroj/pintbot](https://github.com/iiroj/pintbot) for convenience.

## Screenshots

![Screenshot 1](screenshot 1.png?raw=true)

![Screenshot 2](screenshot 2.png?raw=true)

## To-do

- All types of error handling... 😅

## Technology

Pint Bot runs in a [Node.js](https://nodejs.org/en/) backend that [nginx](http://nginx.org) proxies requests to. Here's a brief overview of the server's files and what they do:

### main.js

The startup file for Pint Bot. It requires the _http server— and the _bot backend_.

### server.js

The _HTTP Server_ for Pint Bot. A [Connect](https://github.com/senchalabs/connect) server is listening on port 8443, where [nginx](http://nginx.org) proxies requests to. [Body-parser]() then parses the request bodies to JSON and passes them on to the _bot backend_.

### pintbot.js

The _bot backend_ running on [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api). _pintbot.js_ initializes both the Google API and the Telegram Bot API. _pintbot.js_ then receives requests from _server.js_ and responds according to the message content.

### config.js

The configuration file contains the keys for both the Telegram bot and Google APIs. An example file is provided.

### locations.json

The key-value store for _pintbot.js_ that uses [node-dirty](https://github.com/felixge/node-dirty) to save the users' last-known locations geocoded with [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/intro) using [geocoder](https://github.com/wyattdanger/geocoder). locations.json contains key-values in the following format:

    { "key" : 1234,
      "value: {
        "formatted_addres": "Geocoded name",
        "geometry": {
            "lat": XXX,
            "lng": YYY
        }
      }
    }

### recents.json

The key-value store for three most recent searches of users, using [node-dirty](https://github.com/felixge/node-dirty). These values are used to create a recents keyboard that is sent with most messages. Format is as follows:

    { "key" : 1234,
      "value: {
        ["search 1", "search 2", "search 3"]
      }
    }

## Licence

Pint Bot is licenced under the GNU General Public License, version 2. Please refer to the file [LICENCE](https://github.com/iiroj/pintbot/blob/master/LICENCE) in this project.
