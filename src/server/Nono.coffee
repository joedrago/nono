constants = require '../constants'

class Nono
  constructor: ->

  newGame: (owner) ->
    game =
      owner: owner
      mode: 'menu'
      completed: {}
      players: []
      error: ""
      errorCounter: 0
    return game

  # handles player connects/disconnects, etc
  update: (game, view) ->
    # Process player disconnects
    viewPids = {}
    gamePids = {}
    for sid, viewPlayer of view.players
      viewPids[viewPlayer.pid] = true
    updatedPlayerList = []
    for player in game.players
      if not viewPids[player.pid]
        console.log "Nono[#{game.owner}] Player #{player.pid} (#{player.name}) left."
        continue
      updatedPlayerList.push player
      gamePids[player.pid] = true
    game.players = updatedPlayerList

    # Process player connects
    for sid, viewPlayer of view.players
      if not gamePids[viewPlayer.pid]
        newPlayer =
          pid: viewPlayer.pid
          owner: false
        if viewPlayer.tag?
          newPlayer.name = viewPlayer.tag
          if game.owner == viewPlayer.tag
            newPlayer.owner = true # They can do anything they want!
        else
          newPlayer.name = "Anonymous"
        game.players.push(newPlayer)
        console.log "Nono[#{game.owner}] Player #{newPlayer.pid} #{newPlayer.name} joined."

    game.players.sort (a, b) -> a.pid - b.pid
    # console.log "Nono.update() complete: ", game

  # Helper: get player by pid from the game
  getPlayer: (game, pid) ->
    for player in game.players
      if player.pid == pid
        return player
    return null

  sendError: (game, text) ->
    game.error = text
    game.errorCounter = (game.errorCounter + 1) % 256
    return

  # Update game state based on incoming action packet
  action: (game, pid, pkt) ->
    console.log "Nono.action() pid #{pid}, pkt", pkt
    player = @getPlayer(game, pid)
    if not player?
      return
    if not pkt.action?
      return
    switch pkt.action
      when 'chooseLevel'
        if not pkt.name?
          return
        if not constants.levels[pkt.name]?
          return @sendError(game, "Unknown level: #{pkt.name}")
        game.mode = 'game'
        game.level = pkt.name
    return

module.exports = Nono
