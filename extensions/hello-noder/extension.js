/**
 * Hello Noder – sample extension using the deep Extension API
 */
function activate(api) {
  console.log('[hello-noder] Activated')

  api.registerCommand('hello-noder.sayHello', () => {
    api.showMessage('Hello from the Hello Noder extension! 👋')
    return 'said-hello'
  })

  api.registerCommand('hello-noder.showWorkspace', () => {
    const ws = api.getWorkspace()
    const msg = ws ? `Current workspace: ${ws}` : 'No workspace open'
    api.showMessage(msg)
    return ws
  })
}

function deactivate() {
  console.log('[hello-noder] Deactivated')
}

module.exports = { activate, deactivate }
