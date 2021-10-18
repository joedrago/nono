# ---------------------------------------------------------------------------------------
# Includes

constants = require '../constants'
Screen = require './Screen'

# ---------------------------------------------------------------------------------------
# Globals

screen = null
socket = null
errorCounter = -1
errorTimeout = null
lastView = null
lastGridMetrics = null

# ---------------------------------------------------------------------------------------
# Render

pidToColor = (pid) ->
  return '#afa'

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

renderPlayerList = (view) ->
  fontSize = 16
  x = 5
  y = 5
  for player in view.game.players
    screen.drawText(x, y, "Player #{player.pid}: #{player.name}", fontSize, pidToColor(player.pid))
    y += fontSize

renderMenu = (view) ->
  # html = """
  # <pre>
  # MENU
  # #{JSON.stringify(view, null, 2)}
  # <a onclick=\"actionChooseLevel('easy1')\">play easy1</a>
  # <a onclick=\"actionChooseLevel('easy5')\">play easy5</a>
  # </pre>
  # """
  # document.getElementById('main').innerHTML = html
  screen.fillRect(0, 0, screen.width, screen.height, '#f00')
  renderPlayerList(view)

calcGridMetrics = (view, gridX, gridY, dim) ->
  m =
    gridX: gridX
    gridY: gridY
    gridW: view.game.gridW
    gridH: view.game.gridH
    dim: dim
    maxHints: 0
  for row in view.game.gridHints.rows
    if m.maxHints < row.length
      m.maxHints = row.length
  for col in view.game.gridHints.cols
    if m.maxHints < col.length
      m.maxHints = col.length

  maxCell = view.game.gridW
  if maxCell < view.game.gridH
    maxCell = view.game.gridH

  m.cellDim = Math.floor(dim / (maxCell + m.maxHints + 1))
  m.margin = Math.floor(m.cellDim / 4)

  m.hintColsOffsetX = gridX + (m.margin * 2) + (m.cellDim * m.maxHints)
  m.hintColsOffsetY = gridY + (m.margin * 1)

  m.hintRowsOffsetX = gridX + (m.margin * 1)
  m.hintRowsOffsetY = gridY + (m.margin * 2) + (m.cellDim * m.maxHints)

  m.cellOffsetX = gridX + (m.margin * 2) + (m.cellDim * m.maxHints)
  m.cellOffsetY = gridY + (m.margin * 2) + (m.cellDim * m.maxHints)

  console.log "calcGridMetrics: ", m
  return m

renderGrid = (view, gridX, gridY, dim) ->
  console.log "gridX #{gridX} gridY #{gridY} dim #{dim}"
  m = calcGridMetrics(view, gridX, gridY, dim)
  lastGridMetrics = m
  screen.fillRect(gridX, gridY, dim, dim, '#555')

  for i in [0...view.game.gridW]
    for j in [0...view.game.gridH]
      x = m.cellOffsetX + (i * m.cellDim)
      y = m.cellOffsetY + (j * m.cellDim)
      screen.fillRect(x, y, m.cellDim, m.cellDim, '#888')
      screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#000')

  for col, colIndex in view.game.gridHints.cols
    x = m.hintColsOffsetX + (colIndex * m.cellDim)
    hintCount = col.length
    hintOffset = m.maxHints - hintCount
    for hint, hintIndex in col
      y = m.hintColsOffsetY + ((hintOffset + hintIndex) * m.cellDim)
      # screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#003')
      screen.drawTextCentered(x + (m.cellDim >> 1), y, String(hint), m.cellDim, '#fff')

  for row, rowIndex in view.game.gridHints.rows
    y = m.hintRowsOffsetY + (rowIndex * m.cellDim)
    hintCount = row.length
    hintOffset = m.maxHints - hintCount
    for hint, hintIndex in row
      x = m.hintRowsOffsetX + ((hintOffset + hintIndex) * m.cellDim)
      # screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#003')
      screen.drawTextCentered(x + (m.cellDim >> 1), y, String(hint), m.cellDim, '#fff')

renderGame = (view) ->
  screen.fillRect(0, 0, screen.width, screen.height, '#222')
  renderPlayerList(view)

  # Find a home for the grid, then draw it
  dim = screen.width
  if dim > screen.height
    dim = screen.height
  gridX = (screen.width - dim) >> 1
  gridY = (screen.height - dim) >> 1
  renderGrid(view, gridX, gridY, dim)

render = (view) ->
  console.log "render"
  lastView = view
  renderError(view)
  if view.game.mode == 'menu'
    renderMenu(view)
  else
    renderGame(view)

onResize = ->
  if lastView?
    render(lastView)

onClick = (x, y, which)->
  console.log "onClick(#{x}, #{y}, #{which})"
  if not lastGridMetrics?
    return

  if x < lastGridMetrics.cellOffsetX
    return
  if y < lastGridMetrics.cellOffsetY
    return

  cellX = Math.floor((x - lastGridMetrics.cellOffsetX) / lastGridMetrics.cellDim)
  cellY = Math.floor((y - lastGridMetrics.cellOffsetY) / lastGridMetrics.cellDim)
  if cellX >= lastGridMetrics.gridW
    return
  if cellY >= lastGridMetrics.gridH
    return
  console.log "cellX #{cellX}, cellY #{cellY}, which #{which}"

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

  screen = new Screen('main', onResize, onClick)

# ---------------------------------------------------------------------------------------

module.exports =
  init: init
  update: update
