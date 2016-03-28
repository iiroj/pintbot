var config       = require("./config.js"),
    Dirty        = require("dirty"),
    geocoder     = require("geocoder"),
    GooglePlaces = require("googleplaces"),
    Bot          = require('node-telegram-bot-api')

var locations  = Dirty(__dirname + "/locations.json"),
    places     = new GooglePlaces(config.googleApiKey, "json"),
    pintbot    = new Bot(config.telegramToken)

pintbot.setWebHook(config.telegramUrl + "/" + config.telegramToken)

// Suggest pubs based on the user's location
function suggestPubs(msg) {
  var msgId      = msg.id,
      fromId     = msg.from.id,
      fromName   = msg.from.first_name,
      location   = locations.get(fromId),
      message    = `Here are some suggestions based on your location, ${fromName}.`
      parameters = {
    location: [location.geometry.lat, location.geometry.lng],
    radius: 2000,
    type: "bar"
  }
  places.placeSearch(parameters, function(error, response) {
    if (error) { throw new PlaceSearchException(error.status, msg) }
    if (response.status == "ZERO_RESULTS") { throw new PlaceSearchException(response.status, msg) }

    var results  = response.results.slice(0,5),
        keyboard = results.map(result => [result.name])

    pintbot.sendMessage(fromId, message, {
      reply_to_message_id: msgId,
      reply_markup: {
        force_reply: true,
        keyboard: keyboard,
        one_time_keyboard: true
      }
    })
  })
}

// Find information about a pub based on name and location
function pubInfo(msg) {
  var msgId      = msg.id,
      fromId     = msg.from.id,
      location   = locations.get(fromId),
      parameters = {
        name: msg.text,
        location: [location.geometry.lat, location.geometry.lng],
        rankby: "distance"
      }

  places.placeSearch(parameters, function(error, response) {
    if (error) { PlaceSearchException(error.status, msg); return }
    if (response.status == "ZERO_RESULTS") { PlaceSearchException(response.status, msg); return }

    places.placeDetailsRequest({placeid:response.results[0].place_id}, function (error, response) {
      if (error) { throw new PlaceDetailsException(error.status, msg) }

      var message = `🍻 *${response.result.name}*`
      if (response.result.formatted_address) {
        message += "\n_" + response.result.formatted_address + "_"
      }
      if (response.result.opening_hours) {
        message += "\n\n*"
        if (response.result.opening_hours.open_now == true) {
          message += "Open now!"
        } else {
          message += "Not yet open"
        }
        var day = new Date()
        message += "* (" + response.result.opening_hours.weekday_text[day.getDay()] + ")"
      }
      if (response.result.website || response.result.international_phone_number) {
        message += "\n\n"
        if (response.result.website) {
          message += `[🌍 URL](${response.result.website})    `
        }
        if (response.result.international_phone_number) {
          message += `📞 ${response.result.international_phone_number}`
        }
      }

      pintbot.sendLocation(fromId, response.result.geometry.location.lat, response.result.geometry.location.lng, {
        disable_notification: true,
        reply_to_message_id: msgId,
        reply_markup: {
          hide_keyboard: true
        }
      }).then(pintbot.sendMessage(fromId, message, {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
        reply_to_message_id: msgId,
        reply_markup: {
          hide_keyboard: true
        }
      }))

    })
  })
}

// When user sends a location, save it and pass to suggestPubs()
pintbot.on("location", function(msg) {
  geocoder.reverseGeocode( msg.location.latitude, msg.location.longitude, function ( error, response ) {
    if (error) { GeocoderException(error.status, msg); return }
    var location = {
      formatted_address: undefined,
      geometry: {
        lat: msg.location.latitude,
        lng: msg.location.longitude
      }
    }
    if (response.results[0].formatted_address) {
      location.formatted_address = response.results[0].formatted_address
    }
    locations.set(msg.from.id, location)
    suggestPubs(msg)
  })
})

// When user sends /location, show him his saved location
pintbot.onText(/^\/location$/, function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId),
      locationName = ""

  if (location == undefined) {
    var result = `😰 I don't know where you are, ${fromName}`
  } else {
    if (location.formatted_address !== undefined) {
      locationName = location.formatted_address
      var result   = `My records show you are in ${locationName}`
    } else {
      var coords   = String(location.geometry.lat) + "," + String(location.lng)
      locationName = coords
      var result   = `My records show you are at (${locationName})`
    }
  }
  result += `. To update your location, reply to this message with a *location name* _(for example: "Helsinki")_, or "*cancel*".`

  pintbot.sendMessage(fromId, result, {
    parse_mode: "Markdown",
    reply_markup: {
      force_reply: true
    }
  }).then(function(sent) {
    var chatId = sent.chat.id,
        msgId  = sent.message_id
    pintbot.onReplyToMessage(chatId, msgId, function (msg) {
      if (msg.text == "Cancel" || msg.text == "cancel") {
        pintbot.sendMessage(fromId, `Location update cancelled.`, {
          reply_markup: {
            reply_to_message_id: msg.id,
            hide_keyboard: true
          }
        })
        return
      }
      geocoder.geocode( msg.text, function ( error, response ) {
        if (error) { GeocoderException(error.status, msg); return }
        var location = {
          formatted_address: msg.text,
          geometry: {
            lat: null,
            lng: null
          }
        }
        if (response.results[0].formatted_address) {
          location.formatted_address = response.results[0].formatted_address
        }
        if (response.results[0].geometry.location) {
          location.geometry.lat = response.results[0].geometry.location.lat
          location.geometry.lng = response.results[0].geometry.location.lng
        }
        locations.set(fromId, location)
        pintbot.sendMessage(fromId, `Location updated to ${locationName}.`, {
          reply_markup: {
            reply_to_message_id: msg.id,
            hide_keyboard: true
          }
        })
      })
    })
  })
})

// Notify user in case we do not have his location saved
function demandLocation(fromId, fromName) {
  var message  = `😰 Sorry, ${fromName}. Please send me your location or describe it with /location so that I can help you.`

  pintbot.sendMessage(fromId, message, {
    reply_markup: {
      hide_keyboard: true
    }
  })
}

// When user sends /clear, remove his location
pintbot.onText(/^\/clear$/, function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    var result = `😅 Don't worry, ${fromName}, I didn't know your location anyway.`
  } else {
    var result = `I've cleared your location successfully, ${fromName}`
    locations.set(fromId, undefined)
  }

  pintbot.sendMessage(fromId, result, {
    reply_to_message_id: msgId,
    reply_markup: {
      hide_keyboard: true
    }
  })
})

// When user sends any text not starting with /, use it to find info about a pub. If there is no location saved, pass to demandLocation()
pintbot.onText(/^[^/].+/, function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (msg.reply_to_message) {
    return
  }
  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    pubInfo(msg)
  }
})

// When user sends /suggest, given he has a saved location, suggest him some pubs
pintbot.onText(/^\/suggest$/, function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    suggestPubs(msg)
  }
})

// When user sends /help, show brief help message
pintbot.onText(/^\/help$/, function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      message  = `🍻 My function is to guide you to a pint of beer. Please send me your 📍location to start.

/suggest _Get pub suggestions_
/location _Get your current saved location, or set a new geocodable location (eg. /location Helsinki)_
/clear _Clear your saved location_
/help _Show brief help message_

[About Pint Bot](https://github.com/iiroj/pintbot)`

  pintbot.sendMessage(fromId, message, {
    disable_web_page_preview: true,
    parse_mode: "Markdown",
    reply_to_message_id: msgId,
    reply_markup: {
      hide_keyboard: true
    }
  })
})

// Error handling

function GeocoderException(status, msg) {
  var message = "😰 I couldn't understand your location. Can you try another?"
  pintbot.sendMessage(msg.from.id, message, {
    reply_markup: {
      hide_keyboard: true
    }
  })
  console.error("msg: " + msg.text + "\nGeocoderException: " + status)
}

function PlaceSearchException(status, msg) {
  var message
  if (status == "ZERO_RESULTS") {
    message = "😞 I found nothing. Try another name, or maybe update your location."
  } else {
    message = "😰 Something unexpected happened. Try another name, or maybe update your location."
  }
  pintbot.sendMessage(msg.from.id, message, {
    reply_markup: {
      hide_keyboard: true
    }
  })
  console.error("msg: " + msg.text + "\nPlaceSearchException: " + status)
}

function PlaceDetailsException(status, msg) {
  var message = "😞 I found nothing. Try another name, or maybe update your location."
  pintbot.sendMessage(msg.from.id, message, {
    reply_markup: {
      hide_keyboard: true
    }
  })
  console.error("msg: " + msg.text + "\nPlaceDetailsException: " + status)
}

// Export
module.exports = pintbot
