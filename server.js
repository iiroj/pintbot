var connect     = require("connect"),
    http        = require("http"),
    bodyParser  = require("body-parser"),
    config     = require("./config")

var app = connect()
app.use(bodyParser.json())

module.exports = function (pintbot) {
  app.use("/" + config.token, function(req, res) {
    pintbot.processUpdate(req.body)
    res.statusCode = 200
    res.end()
  })
}

http.createServer(app).listen(8443, "127.0.0.1")
console.log("Webhook listener standing by.")
