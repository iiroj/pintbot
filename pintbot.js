var logic = require("./logic.js"),
    config = require("./config.js"),
    Bot   = require('node-telegram-bot-api'),
    pubKeyboard = JSON.stringify({
      keyboard: [
        ["One Pint Pub", "Kitty's Public House"],
        ["Oluthuone Kaisla", "Brewdog Helsinki"],
        ["🎲"]
      ],
      resize_keyboard: true
    })

var pintbot = new Bot(config.token)
pintbot.setWebHook(config.url + "/" + config.token)

function sendPubInfo(msg) {
  var fromId = msg.from.id,
      date = new Date()
  var pub = logic.selectPub(msg.text),
      pubInfo = logic.pubInfo(pub, date)
  pintbot.sendMessage(fromId, pubInfo, {
      disable_web_page_preview: true,
      parse_mode: "markdown"
  }).then(
    pintbot.sendLocation(fromId, pub.position.lat, pub.position.lng)
  )
}

function defaultReply(msg) {
  var fromId = msg.from.id,
      fromName = msg.from.first_name,
      firstReply = "Hello, " + fromName + "! Where would you like to go for a pint?"
  pintbot.sendMessage(fromId, firstReply, {
    force_reply: true,
    reply_markup: pubKeyboard
  })
}

pintbot.onText(/(.+)/, function(msg) {
  if (msg.text == "One Pint Pub" | msg.text == "Kitty's Public House" | msg.text == "Oluthuone Kaisla" | msg.text == "Brewdog Helsinki" | msg.text == "🎲") {
    sendPubInfo(msg)
  } else {
    defaultReply(msg)
  }
})

module.exports = pintbot
