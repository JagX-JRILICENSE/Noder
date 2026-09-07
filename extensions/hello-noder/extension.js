/**
 * Hello Noder – sample extension
 * This is a foundation example. Full activation API will be expanded.
 */
function activate(api) {
  console.log('[hello-noder] Extension activated')
  // Future: api.registerCommand('hello-noder.sayHello', () => { ... })
}

function deactivate() {
  console.log('[hello-noder] Extension deactivated')
}

module.exports = { activate, deactivate }
