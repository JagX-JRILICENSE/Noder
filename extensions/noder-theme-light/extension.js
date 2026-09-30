exports.activate = function (api) {
  api.registerCommand('noder-theme-light.apply', function () {
    if (typeof window !== 'undefined' && window.__noderApplyTheme) {
      window.__noderApplyTheme('light')
    }
    api.showMessage('Theme: Light+ applied')
  })
}
exports.deactivate = function () {}
