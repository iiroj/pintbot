const config       = require("./config.js");
const Dirty        = require("dirty");
const geocoder     = require("geocoder");
const GooglePlaces = require("googleplaces");
const Bot          = require('node-telegram-bot-api');
const locations    = Dirty(__dirname + "/locations.json");
const places       = new GooglePlaces(config.googleApiKey, "json");
const pintbot      = new Bot(config.telegramToken);
const recents      = Dirty(__dirname + "/recents.json");

pintbot.setWebHook(config.telegramUrl + "/" + config.telegramToken);

// Suggest pubs based on the user's location
function suggestPubs(msg) {
  const msgId      = msg.id;
  const fromId     = msg.from.id;
  const fromName   = msg.from.first_name;
  const location   = locations.get(fromId);
  const message    = `Here are some suggestions based on your location, ${fromName}.`;
  var   parameters = {
    location: [location.geometry.lat, location.geometry.lng],
    rankby: "distance",
    type: "bar"
  };

  places.placeSearch(parameters, function(error, response) {
    if (error) {
      PlaceSearchException(error.status, msg);
      return;
    } if (response.status == "ZERO_RESULTS") {
      PlaceSearchException(response.status, msg);
      return;
    }

    const results  = response.results.slice(0,5);
    const keyboard = results.map(result => [result.name]);
    pintbot.sendMessage(fromId, message, {
      reply_to_message_id: msgId,
      reply_markup: {
        force_reply: true,
        keyboard: keyboard,
        one_time_keyboard: true
      }
    });
  });
};

// Find information about a pub based on name and location
function pubInfo(msg) {
  const msgId      = msg.id;
  const fromId     = msg.from.id;
  const location   = locations.get(fromId);
  var   parameters = {
        name: msg.text,
        location: [location.geometry.lat, location.geometry.lng],
        rankby: "distance"
      };

  places.placeSearch(parameters, function(error, response) {
    if (error) {
      PlaceSearchException(error.status, msg);
      return;
    } if (response.status == "ZERO_RESULTS") {
      PlaceSearchException(response.status, msg);
      return;
    }

    places.placeDetailsRequest({placeid:response.results[0].place_id}, function (error, response) {
      if (error) {
        PlaceDetailsException(error.status, msg);
        return;
      }

      var message = `🍻 *${response.result.name}*`;
      if (response.result.formatted_address) {
        message += "\n_" + response.result.formatted_address + "_";
      }
      if (response.result.opening_hours) {
        message += "\n\n*";
        if (response.result.opening_hours.open_now == true) {
          message += "Open now!";
        } else {
          message += "Not yet open";
        }
        var day = new Date();
        message += "* (" + response.result.opening_hours.weekday_text[day.getDay()] + ")";
      }
      if (response.result.website || response.result.international_phone_number) {
        message += "\n\n";
        if (response.result.website) {
          message += `[🌍 URL](${response.result.website})    `;
        }
        if (response.result.international_phone_number) {
          message += `📞 ${response.result.international_phone_number}`;
        }
      }
      pintbot.sendLocation(fromId, response.result.geometry.location.lat, response.result.geometry.location.lng, {
        disable_notification: true,
        reply_to_message_id: msgId,
        reply_markup: {
          keyboard: recents.get(fromId),
          resize_keyboard: true
        }
      }).then(pintbot.sendMessage(fromId, message, {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
        reply_to_message_id: msgId,
        reply_markup: {
          keyboard: recents.get(fromId),
          resize_keyboard: true
        }
      }));
    });
  });
};

function updateRecents(msg) {
  var recent = recents.get(msg.from.id);
  if (recent == undefined) {
    recent = [[msg.text]];
  } else {
    Array.prototype.push.apply(recent[0], [msg.text]);
  }

  recents.set(msg.from.id, [recent[0].slice(-3)]);
};

// When user sends a location, save it and pass to suggestPubs()
pintbot.on("location", function(msg) {
  geocoder.reverseGeocode( msg.location.latitude, msg.location.longitude, function ( error, response ) {
    if (error) {
      GeocoderException(error.status, msg);
      return;
    }

    var location = {
      formatted_address: undefined,
      geometry: {
        lat: msg.location.latitude,
        lng: msg.location.longitude
      }
    };
    if (response.results[0].formatted_address) {
      location.formatted_address = response.results[0].formatted_address;
    }

    locations.set(msg.from.id, location);
    suggestPubs(msg);
  });
});

// When user sends /location, show him his saved location
pintbot.onText(/^\/location$/, function(msg) {
  const fromId       = msg.from.id;
  const fromName     = msg.from.first_name;
  var   location     = locations.get(fromId);
  var   locationName = "";
  if (location == undefined) {
    var result = `😰 I don't know where you are, ${fromName}`;
  } else {
    if (location.formatted_address !== undefined) {
      locationName = location.formatted_address;
      var result   = `My records show you are in ${locationName}`;
    } else {
      const coords = String(location.geometry.lat) + "," + String(location.lng);
      locationName = coords;
      var result   = `My records show you are at (${locationName})`;
    }
  }
  result += `. To update your location, reply to this message with a *location name* _(for example: "Helsinki")_, or "*cancel*".`;

  pintbot.sendMessage(fromId, result, {
    parse_mode: "Markdown",
    reply_markup: {
      force_reply: true
    }
  }).then(function(sent) {
    const sentChatId = sent.chat.id;
    const sentMsgId  = sent.message_id;

    pintbot.onReplyToMessage(sentChatId, sentMsgId, function (msg) {
      if (msg.text == "Cancel" || msg.text == "cancel") {
        pintbot.sendMessage(fromId, `Location update cancelled.`, {
          reply_to_message_id: msg.id,
          reply_markup: {
            keyboard: recents.get(fromId),
            resize_keyboard: true
          }
        });
        return;
      }
      geocoder.geocode( msg.text, function ( error, response ) {
        if (error) {
          GeocoderException(error.status, msg);
          return;
        }

        var location = {
          formatted_address: msg.text,
          geometry: {
            lat: null,
            lng: null
          }
        };
        if (response.results[0].formatted_address) {
          location.formatted_address = response.results[0].formatted_address;
        }
        if (response.results[0].geometry.location) {
          location.geometry.lat = response.results[0].geometry.location.lat;
          location.geometry.lng = response.results[0].geometry.location.lng;
        }
        locations.set(fromId, location);
        pintbot.sendMessage(fromId, `Location updated to ${location.formatted_address}.`, {
          reply_to_message_id: msg.id,
          reply_markup: {
            keyboard: recents.get(fromId),
            resize_keyboard: true
          }
        });
      });
    });
  });
});

// Notify user in case we do not have his location saved
function demandLocation(fromId, fromName) {
 pintbot.sendMessage(fromId, `😰 Sorry, ${fromName}. Please send me your location or describe it with /location so that I can help you.`, {
    reply_markup: {
      hide_keyboard: true
    }
  });
};

// When user sends /clear, remove his location
pintbot.onText(/^\/clear$/, function(msg) {
  const msgId    = msg.id;
  const fromId   = msg.from.id;
  const fromName = msg.from.first_name;
  const location = locations.get(fromId);

  if (location == undefined) {
    var result = `😅 Don't worry, ${fromName}, I didn't know your location anyway.`;
  } else {
    var result = `I've cleared your location successfully, ${fromName}`;
    locations.set(fromId, undefined);
  }

  pintbot.sendMessage(fromId, result, {
    reply_to_message_id: msgId,
    reply_markup: {
      hide_keyboard: true
    }
  });
});

// When user sends any text not starting with /, use it to find info about a pub. If there is no location saved, pass to demandLocation()
pintbot.onText(/^[^/].+/, function(msg) {
  const fromId   = msg.from.id;
  const fromName = msg.from.first_name;
  const location = locations.get(fromId);

  if (msg.reply_to_message) {
    return;
  }

  updateRecents(msg);

  if (location == undefined) {
    demandLocation(fromId, fromName);
  } else {
    pubInfo(msg);
  }
});

// When user sends /suggest, given he has a saved location, suggest him some pubs
pintbot.onText(/^\/suggest$/, function(msg) {
  const fromId   = msg.from.id;
  const fromName = msg.from.first_name;
  const location = locations.get(fromId);

  if (location == undefined) {
    demandLocation(fromId, fromName);
  } else {
    suggestPubs(msg);
  }
});

// When user sends /help, show brief help message
pintbot.onText(/^\/help$/, function(msg) {
  const msgId    = msg.id;
  const fromId   = msg.from.id;
  const fromName = msg.from.first_name;
  const message  = `🍻 My function is to guide you to a pint of beer. Please send me your 📍location to start.

/suggest _Get pub suggestions_
/location _Get your current saved location, or set a new geocodable location (eg. /location Helsinki)_
/clear _Clear your saved location_
/help _Show brief help message_

[About Pint Bot](https://github.com/iiroj/pintbot)`;

  pintbot.sendMessage(fromId, message, {
    disable_web_page_preview: true,
    parse_mode: "Markdown",
    reply_to_message_id: msgId,
    reply_markup: {
      keyboard: recents.get(fromId),
      resize_keyboard: true
    }
  });
});

// Error handling

function GeocoderException(status, msg) {
  pintbot.sendMessage(msg.from.id, `😰 I couldn't understand your location. Can you try another?`, {
    reply_markup: {
      hide_keyboard: true
    }
  });
  console.error(`msg: ${msg.text}; GeocoderException: ${status}`);
}

function PlaceSearchException(status, msg) {
  if (status == "ZERO_RESULTS") {
    var message = `😞 I found nothing. Try another name, or maybe update your location.`;
  } else {
    var message = `😰 Something unexpected happened. Try another name, or maybe update your location.`;
  }

  pintbot.sendMessage(msg.from.id, message, {
    reply_markup: {
      hide_keyboard: true
    }
  });
  console.error(`msg: ${msg.text}; GeocoderException: ${status}`);
}

function PlaceDetailsException(status, msg) {
  pintbot.sendMessage(msg.from.id, `😞 I found nothing. Try another name, or maybe update your location.`, {
    reply_markup: {
      hide_keyboard: true
    }
  });
  console.error(`msg: ${msg.text}; GeocoderException: ${status}`);
}

// Export
module.exports = pintbot;
