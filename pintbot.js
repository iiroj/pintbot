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

  pintbot.sendMessage(fromId, message)
}

// Find a list of pubs based on the user's location
function findPubs(fromId, fromName) {
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
      arr.push("/bar " + obj.venue.name)
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
function pubInfo(query, location) {
	var searchObj = {
    ll: String(location.lat) + "," + String(location.lng),
		query: query,
		intent: "match"
	}

	foursquare.searchVenues(searchObj, function(error, response) {
	  if (error) { return console.error(error) }
	  console.log(response.response)
	})
}

// When user sends a location, save it and pass to findPubs()
pintbot.on("location", function(msg) {
  var fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = { lat: msg.location.latitude, lng: msg.location.longitude }

  locations.set(fromId, location)
  findPubs(fromId, fromName)
})

// When users sends /location, save the query as a location string
pintbot.onText(/^\/location (.+)$/, function(msg, match) {
  var query    = match[1],
      fromId   = msg.from.id,
      fromName = msg.from.first_name

  locations.set(fromId, query)
  findPubs(fromId, fromName)
})

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

  pintbot.sendMessage(fromId, result)
})

// When users sends /bar, use it and location to find info about a pub. If there is location saved, pass to demandLocation()
pintbot.onText(/^\/bar (.+)$/, function(msg, match) {
	var query    = match[1],
      fromId   = msg.from.id,
      fromName = msg.from.first_name,
      location = locations.get(fromId)

  if (location == undefined) {
    demandLocation(fromId, fromName)
  } else {
    pubInfo(query, location)
  }
})

module.exports = pintbot
