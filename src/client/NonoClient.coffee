# ---------------------------------------------------------------------------------------
# Includes

constants = require '../constants'

# ---------------------------------------------------------------------------------------
# Globals

socket = null
errorCounter = -1
errorTimeout = null

# ---------------------------------------------------------------------------------------
# Render

hideError = ->
  document.getElementById('error').style.display = 'none'

renderError = (view) ->
  if errorCounter != view.game.errorCounter
    errorCounter = view.game.errorCounter
    if errorTimeout?
      clearTimeout(errorTimeout)
    errorTimeout = setTimeout(hideError, 3000)
    document.getElementById('error').innerHTML = view.game.error
    document.getElementById('error').style.display = 'block'
  return

renderMenu = (view) ->
  html = """
  <pre>
  MENU
  #{JSON.stringify(view, null, 2)}
  <a onclick=\"actionChooseLevel('easy1')\">play easy1</a>
  <a onclick=\"actionChooseLevel('easy5')\">play easy5</a>
  </pre>
  """
  document.getElementById('main').innerHTML = html

renderGame = (view) ->
  html = """
  <pre>
  GAME
  #{JSON.stringify(view, null, 2)}
  </pre>
  """
  document.getElementById('main').innerHTML = html

render = (view) ->
  renderError(view)
  if view.game.mode == 'menu'
    renderMenu(view)
  else
    renderGame(view)

# ---------------------------------------------------------------------------------------
# Actions

actionChooseLevel = (levelName) ->
  console.log "actionChooseLevel: #{levelName}"
  socket.emit 'action', {
    action: 'chooseLevel'
    name: levelName
  }

# ---------------------------------------------------------------------------------------
# Update

update = (view) ->
  render(view)

# ---------------------------------------------------------------------------------------
# Init

init = (s) ->
  socket = s

  window.actionChooseLevel = actionChooseLevel

# ---------------------------------------------------------------------------------------

module.exports =
  init: init
  update: update
