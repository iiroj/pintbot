var config     = require("./config.js"),
    Dirty      = require("dirty"),
    Foursquare = require("foursquare-venues"),
    Bot        = require('node-telegram-bot-api')

var locations  = Dirty("locations.json"),
    llLoaded   = false,
    foursquare = new Foursquare(config.foursquareClientId, config.foursquareClientSecret),
    pintbot    = new Bot(config.telegramToken)

pintbot.setWebHook(config.telegramUrl + "/" + config.telegramToken)

// Suggest pubs based on the user's location
function suggestPubs(msgId, fromId, fromName) {
  var location  = locations.get(fromId),
      searchObj = { query: "beer", limit: 5, section: "drinks" }

  if (location instanceof Object) {
    var msg = `Here are some suggestions based on your 📍location, ${fromName}.`,
        ll  = String(location.lat) + "," + String(location.lng)
    searchObj["ll"] = ll
  } else {
    var msg  = `Here are some suggestions based on your 💭location, ${fromName}.`
    searchObj["near"] = location
  }

  foursquare.exploreVenues(searchObj, function(error, response) {
    if (error) {
      console.error(error)
      pintbot.sendMessage(fromId, `Something went wrong, ${fromName}. Maybe try another 📍location?`, {
        reply_to_message_id: msgId,
        reply_markup: {
          hide_keyboard: true
        }
      })
      return
    }

    var venues = response.response.groups[0].items
    var offerKeyboard = venues.map(function(obj) {
      return [obj.venue.name]
    })

    pintbot.sendMessage(fromId, msg, {
      parse_mode: "markdown",
      reply_to_message_id: msgId,
      reply_markup: {
        keyboard: offerKeyboard,
        one_time_keyboard: true
      }
    })
  })
}

// Find information about a pub based on name and location
function pubInfo(msgId, fromId, fromName, query, location) {
  var searchObj = {
    query: query,
    intent: "checkin",
    limit: "1",
    categoryId: "4bf58dd8d48988d116941735,4bf58dd8d48988d11b941735" // Limit to Bars, Pubs
  }
  if (location instanceof Object) {
    ll  = String(location.lat) + "," + String(location.lng)
    searchObj["ll"] = ll
  } else {
    searchObj["near"] = location
  }

  foursquare.searchVenues(searchObj, function(error, response) {
    if (error) {
      console.error(error)
      pintbot.sendMessage(fromId, `Something went wrong, ${fromName}. Maybe try another 📍location?`, {
        reply_to_message_id: msgId,
        reply_markup: {
          hide_keyboard: true
        }
      })
      return
    }

    var pub = response.response.venues[0]

    if (pub == undefined) {
      pintbot.sendMessage(fromId, `I found nothing, ${fromName}. Maybe try another 📍location?`, {
        reply_to_message_id: msgId,
        reply_markup: {
          hide_keyboard: true
        }
      })
      return
    }

    var message = `🍻 *${pub.name}*`
    if (pub.location.formattedAddress) {
      message += "\n " + pub.location.formattedAddress.join(", ")
    }
    if (pub.location.distance) {
      message += `
_(${pub.location.distance} meters away)_`
    }
    if (pub.url | pub.contact.phone | pub.contact.formattedPhone) {
      message += "\n\n"
      if (pub.url) {
        message += `[🌍 URL](${pub.url})    `
      }
      if (pub.contact.formattedPhone) {
        message += `📞 ${pub.contact.formattedPhone}`
      } else if (pub.contact.phone){
        message += `📞 ${pub.contact.phone}`
      }
    }
    if (pub.menu) {
      message += `
[🍺 Menu](${pub.menu.url})`
    }

    pintbot.sendLocation(fromId, pub.location.lat, pub.location.lng, {
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
}

// When user sends a location, save it and pass to suggestPubs()
pintbot.on("location", function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = { lat: msg.location.latitude, lng: msg.location.longitude }

  locations.set(fromId, location)
  suggestPubs(msgId, fromId, fromName)
})

// When user sends /location with some query, save the query as a location string
pintbot.onText(/^\/location (.+)$/, function(msg, match) {
  var query    = match[1],
      msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name

  locations.set(fromId, query)
  suggestPubs(msgId, fromId, fromName)
})

// When user sends /location, show him his saved location
pintbot.onText(/^\/location$/, function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    var result = `😰 I don't know where you are, ${fromName}. Please send me your 📍location or describe it with /location.`
  } else if (location instanceof Object) {
    var coords = String(location.lat) + "," + String(location.lng),
        result = `My records show you are at 📍(${coords}), ${fromName}`
  } else {
    var result = `My records show you are in 💭${location}, ${fromName}.`
  }

  pintbot.sendMessage(fromId, result, {
    reply_markup: {
      hide_keyboard: true
    }
  })
})

// Notify user in case we do not have his location saved
function demandLocation(fromId, fromName) {
  var message  = `😰 Sorry, ${fromName}. Please send me your 📍location or describe it with /location so that I can help you.`

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
    if (location instanceof Object) {
      var result = `I've cleared your 📍location successfully, ${fromName}`
    } else {
      var result = `I've cleared your 💭location successfully, ${fromName}`
    }
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
  var query    = msg.text,
      msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    pubInfo(msgId, fromId, fromName, query, location)
  }
})

// When user sends /suggest, given he has a saved location, suggest him some pubs
pintbot.onText(/^\/suggest$/, function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    suggestPubs(msgId, fromId, fromName)
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
/help _Show brief help message_`

  pintbot.sendMessage(fromId, message, {
    disable_web_page_preview: true,
    parse_mode: "Markdown",
    reply_to_message_id: msgId,
    reply_markup: {
      hide_keyboard: true
    }
  })
})

module.exports = pintbot
