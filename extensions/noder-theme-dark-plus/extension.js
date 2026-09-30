exports.activate = function (api) {
  api.registerCommand('noder-theme-dark-plus.apply', function () {
    if (typeof window !== 'undefined' && window.__noderApplyTheme) {
      window.__noderApplyTheme('dark-plus')
    }
    api.showMessage('Theme: Dark+ applied')
  })
}
exports.deactivate = function () {}
