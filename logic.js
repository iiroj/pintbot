var pubs = [{
    close:    [02, 00, 00, 00, 00, 00, 02],
    name:     "One Pint Pub",
    menu:     "http://baari.info/onepintpub/hinnasto_hana_oluet.php",
    open:     [13, 15, 15, 15, 15, 13, 13],
    position: {lat: 60.1620431, lng: 24.920245799999975},
    url:      "http://www.onepintpub.com"
  },{
    close:    [03, 00, 01, 01, 02, 02, 03],
    name:     "Kitty's Public House",
    menu:     null,
    open:     [12, 12, 12, 12, 12, 11, 11],
    position: {lat: 60.169511, lng: 24.941737999999987},
    url:      "https://www.raflaamo.fi/fi/helsinki/kittys-public-house"
  },{
    close:    [03, 02, 02, 02, 02, 02, 03],
    name:     "Oluthuone Kaisla",
    menu:     null,
    open:     [12, 12, 12, 12, 12, 12, 12],
    position: {lat: 60.1719322, lng: 24.946702200000004},
    url:      "https://www.raflaamo.fi/fi/helsinki/kaisla"
  },{
    close:    [02, null, 00, 01, 01, 01, 02],
    name:     "Brewdog Helsinki",
    menu:     null,
    open:     [null, 14, 14, 14, 14, 14, 12],
    position: {lat: 60.160719, lng: 24.9422693},
    url:      "https://www.brewdog.com/bars/worldwide/helsinki"
  }],
  date,
  day

function selectPub(msgContent) {
  if (msgContent == "🎲") {
    var pub = pubs[~~(Math.random() * pubs.length)]
  } else {
    var pub = pubs.filter(function(pub) {return pub.name == msgContent})[0]
  }
  return pub
}

function whenWillPubOpen(pub) {
  var pubOpenIndex   = day,
      pubOpenOffset  = 0,
      pubCloseIndex  = day,
      pubCloseOffset = 0
  while (pub.open[pubOpenIndex] == null) {
    pubOpenIndex++ % 7
    pubOpenOffset++
    if (pub.open[pubOpenIndex] == !null) break
  }
  while (pub.close[pubCloseIndex] == null) {
    pubCloseIndex-- % 7
    pubCloseOffset--
    if (pub.open[pubCloseIndex] == !null) break
  }
  function hoursToOpenCalc() {
    if (date.getMinutes() !== 00) {
      return 24*pubOpenOffset + pub.open[pubOpenIndex] - date.getHours() - 1
    } else {
      return 24*pubOpenOffset + pub.open[pubOpenIndex] - date.getHours()
    }
  }
  function hoursSinceCloseCalc() {
    if (date.getMinutes() !== 00) {
      return date.getHours() - 24*pubCloseOffset - pub.close[pubCloseIndex]
    } else {
      return date.getHours() - 24*pubCloseOffset - pub.close[pubCloseIndex]
    }
  }
  var hoursToOpen     = hoursToOpenCalc(),
      hoursSinceClose = hoursSinceCloseCalc(),
      minutes         = 60 - date.getMinutes(),
      string          = "🍻 " + pub.name + " on jo auki!"
  if (hoursToOpen > 0 && hoursSinceClose > 0) {
    string = "Aukeaa"
    if (hoursToOpen > 0) { string += " " + hoursToOpen + " h" }
    if (hoursToOpen > 0 && date.getMinutes() !== 00) { string += ","}
    if (date.getMinutes() !== 00) { string += " " + minutes + " min" }
    string += " päästä"
  }
  return string
}

var selectedPubInfo = function(pub, msgDate) {
  date = msgDate
  day = date.getDay()

  if (pub.menu !== null) {
    var pubMenu =  " • [olutvalikoima](" + pub.menu + ")"
  } else { var pubMenu = ""}

  var pubOpen      = whenWillPubOpen(pub),
      pubOpenRange = " _(klo " + pub.open[day] + " – " + pub.close[day] + ")_"

  var response = "*" + pub.name + "*\n" + "[kotisivut](" + pub.url + ")" + pubMenu + "\n\n" + pubOpen + pubOpenRange
  return response
}

exports.selectPub = selectPub
exports.pubInfo = selectedPubInfo
