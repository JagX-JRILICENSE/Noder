exports.activate = function (api) {
  api.registerCommand('noder-copilot-bridge.build', function () {
    api.showMessage('Open AI Agent (Ctrl+Shift+A) and describe the feature to build.')
  })
}
exports.deactivate = function () {}
