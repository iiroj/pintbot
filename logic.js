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
      string          = "🍻 " + pub.name + " is already open!"
  if (hoursToOpen > 0 && hoursSinceClose > 0) {
    string = pub.name + " opens in"
    if (hoursToOpen > 0) { string += " " + hoursToOpen + " hours" }
    if (hoursToOpen > 0 && date.getMinutes() !== 00) { string += ","}
    if (date.getMinutes() !== 00) { string += " " + minutes + " min" }
  }
  return string
}

var offeredPubs = function(searchObj) {
  
}

exports.offeredPubs = offeredPubs
// exports.pubKeyboard = pubKeyboard
// exports.pubInfo = pubInfo
