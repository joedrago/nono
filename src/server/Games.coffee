Nono = require './Nono'

class Games
  constructor: ->
    @brain = new Nono
    @saveNeeded = false
    @games = {} # keyed by owner
    @load()

  saveIfNeeded: ->
    if not @saveNeeded
      return
    @save()

  load: ->

  save: ->

  updateView: (view) ->
    game = @games[view.owner]
    if not game?
      # Initialize a fresh game for this new logged-in player
      game = @brain.newGame(view.owner)
      @games[view.owner] = game

    view.game = game
    @brain.update(game, view)
    return

  action: (view, pid, pkt) ->
    if not pkt.action?
      return
    @updateView(view)
    @brain.action(view.game, pid, pkt)

module.exports = Games
