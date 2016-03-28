const connect     = require("connect");
const http        = require("http");
const bodyParser  = require("body-parser");

const app = connect();
app.use(bodyParser.json());

module.exports = function (pintbot) {
  app.use(function(request, response) {
    pintbot.processUpdate(request.body);
    response.statusCode = 200;
    response.end();
  });
};

http.createServer(app).listen(8443, "127.0.0.1");