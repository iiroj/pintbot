var config     = require("./config.js"),
    Dirty      = require("dirty"),
    Foursquare = require("foursquare-venues"),
    Bot        = require('node-telegram-bot-api')

var locations  = Dirty("locations.json"),
    llLoaded   = false,
    foursquare = new Foursquare(config.foursquareClientId, config.foursquareClientSecret),
    pintbot    = new Bot(config.telegramToken)

pintbot.setWebHook(config.telegramUrl + "/" + config.telegramToken)

// Notify user in case we do not have his location saved
function demandLocation(fromId, fromName) {
  var message  = "😰 Sorry, " + fromName + ". I can't find you beer without knowing where you are. Please send me your 📍location or describe it with /location."

  pintbot.sendMessage(fromId, message, {
    ReplyKeyboardHide: {
      hide_keyboard: true
    }
  })
}

// Suggest pubs based on the user's location
function suggestPubs(fromId, fromName) {
  var location  = locations.get(fromId),
      searchObj = { query: "beer", limit: 5 }

  if (location instanceof Object) {
    var msg = "Here are some suggestions based on your 📍location, " + fromName + ".",
        ll  = String(location.lat) + "," + String(location.lng)
    searchObj["ll"] = ll
  } else {
    var msg  = "Here are some suggestions based on your 💭location, " + fromName + "."
    searchObj["near"] = location
  }

  foursquare.exploreVenues(searchObj, function(error, response) {
    if (error) { return console.error(error) }
    var venues = response.response.groups[0].items
    var offerKeyboard = venues.map(function(obj) {
      var arr = []
      arr.push("/pub " + obj.venue.name)
      return arr 
    })

    pintbot.sendMessage(fromId, msg, {
      parse_mode: "markdown",
      reply_markup: {
        keyboard: offerKeyboard,
        one_time_keyboard: true
      }
    })
  })
}

// Find information about a pub based on name and location
function pubInfo(msgId, fromId, query, location) {
  var searchObj = {
    query: query,
    intent: "checkin",
    limit: "1"
  }
  if (location instanceof Object) {
    ll  = String(location.lat) + "," + String(location.lng)
    searchObj["ll"] = ll
  } else {
    searchObj["near"] = location
  }

  foursquare.searchVenues(searchObj, function(error, response) {
    if (error) { return console.error(error) }
    var pub = response.response.venues[0],
        addr = pub.location.formattedAddress.join(", ")
        message = "🍻 *" + pub.name + "* \n" + addr
    console.log(pub.location.formattedAddress)
    pintbot.sendLocation(fromId, pub.location.lat, pub.location.lng, {
      disable_notification: true,
      reply_to_message_id: msgId,
      ReplyKeyboardHide: {
        hide_keyboard: true
      }
    }).then(pintbot.sendMessage(fromId, message, {
      disable_web_page_preview: true,
      parse_mode: "Markdown",
      reply_to_message_id: msgId,
      ReplyKeyboardHide: {
        hide_keyboard: true
      }
    }))
  })
}

// When user sends a location, save it and pass to suggestPubs()
pintbot.on("location", function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = { lat: msg.location.latitude, lng: msg.location.longitude }

  locations.set(fromId, location)
  suggestPubs(fromId, fromName)
})

// When user sends /location with some query, save the query as a location string
pintbot.onText(/^\/location (.+)$/, function(msg, match) {
  var query    = match[1],
      fromId   = msg.from.id,
      fromName = msg.from.first_name

  locations.set(fromId, query)
  suggestPubs(fromId, fromName)
})

// When user sends /location, show him his saved location
pintbot.onText(/^\/location$/, function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    var result = "😰 I don't know where you are, " + fromName + ". You can send me your 📍location or describe it with /location."
  } else if (location instanceof Object) {
    var coords = String(location.lat) + "," + String(location.lng),
        result = "My records show you are at coordinates " + coords + ", " + fromName + "."
  } else {
    var result = "My records show you are in " + location + ", " + fromName + "."
  }

  pintbot.sendMessage(fromId, result, {
    ReplyKeyboardHide: {
      hide_keyboard: true
    }
  })
})

// When user sends /pub and some query, use it and location to find info about a pub. If there is location saved, pass to demandLocation()
pintbot.onText(/^\/pub (.+)$/, function(msg, match) {
  var query    = match[1],
      msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    pubInfo(msgId, fromId, query, location)
  }
})

// When user sends /pub, given he has a saved location, suggest him some pubs
pintbot.onText(/^\/pub$/, function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    suggestPubs(fromId, fromName)
  }
})

// When user sends /help, show brief help message
pintbot.onText(/^\/help$/, function(msg) {
  var msgId    = msg.id,
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      message  = "🍻 My function is to guide you to a pint of beer. Please send me your 📍location to start. \n\n /pub _Get information and directions to a specific pub near your location_ \n /location _Get your current saved location, or set a new geocodable location_ \n /help _Show brief help message_"

  pintbot.sendMessage(fromId, message, {
    disable_web_page_preview: true,
    parse_mode: "Markdown",
    reply_to_message_id: msgId,
    ReplyKeyboardHide: {
      hide_keyboard: true
    }
  })
})

module.exports = pintbot
