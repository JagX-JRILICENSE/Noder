exports.activate = function (api) {
  api.registerCommand('noder-flutter-tools.pubGet', function () {
    api.showMessage('Run in Terminal: flutter pub get')
  })
  api.registerCommand('noder-flutter-tools.runWeb', function () {
    api.showMessage('Run: flutter run -d web-server --web-port 8080 then App Preview → http://localhost:8080')
  })
}
exports.deactivate = function () {}
