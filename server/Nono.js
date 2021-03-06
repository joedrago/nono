// Generated by CoffeeScript 2.6.1
(function() {
  var Nono, constants;

  constants = require('../constants');

  Nono = class Nono {
    constructor() {}

    newGame(owner) {
      var game;
      game = {
        owner: owner,
        mode: 'game',
        completed: {},
        players: [],
        error: "",
        errorCounter: 0,
        level: 'easy1',
        gridW: 10,
        gridH: 10,
        gridHints: {
          rows: [[1, 1], [3, 3], [3, 3], [1, 1], [3, 4], [3, 4], [1, 1], [3, 3, 2], [9], [7]],
          cols: [[1], [2, 2], [2, 2, 3], [7, 2], [2, 3], [2, 3], [2, 2, 3], [7, 2], [2, 2, 3], [2]]
        },
        gridAnswer: [[0, 0, 0, 1, 0, 0, 0, 1, 0, 0], [0, 0, 1, 1, 1, 0, 1, 1, 1, 0], [0, 0, 1, 1, 1, 0, 1, 1, 1, 0], [0, 0, 0, 1, 0, 0, 0, 1, 0, 0], [0, 1, 1, 1, 0, 1, 1, 1, 1, 0], [0, 1, 1, 1, 0, 1, 1, 1, 1, 0], [0, 0, 0, 1, 0, 0, 0, 1, 0, 0], [1, 1, 1, 0, 1, 1, 1, 0, 1, 1], [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 1, 1, 1, 1, 1, 1, 1, 0]],
        gridUser: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
      };
      return game;
    }

    // handles player connects/disconnects, etc
    update(game, view) {
      var gamePids, i, len, newPlayer, player, ref, ref1, ref2, sid, updatedPlayerList, viewPids, viewPlayer;
      // Process player disconnects
      viewPids = {};
      gamePids = {};
      ref = view.players;
      for (sid in ref) {
        viewPlayer = ref[sid];
        viewPids[viewPlayer.pid] = true;
      }
      updatedPlayerList = [];
      ref1 = game.players;
      for (i = 0, len = ref1.length; i < len; i++) {
        player = ref1[i];
        if (!viewPids[player.pid]) {
          console.log(`Nono[${game.owner}] Player ${player.pid} (${player.name}) left.`);
          continue;
        }
        updatedPlayerList.push(player);
        gamePids[player.pid] = true;
      }
      game.players = updatedPlayerList;
      ref2 = view.players;
      // Process player connects
      for (sid in ref2) {
        viewPlayer = ref2[sid];
        if (!gamePids[viewPlayer.pid]) {
          newPlayer = {
            pid: viewPlayer.pid,
            owner: false
          };
          if (viewPlayer.tag != null) {
            newPlayer.name = viewPlayer.tag;
            if (game.owner === viewPlayer.tag) {
              newPlayer.owner = true; // They can do anything they want!
            }
          } else {
            newPlayer.name = "Anonymous";
          }
          game.players.push(newPlayer);
          console.log(`Nono[${game.owner}] Player ${newPlayer.pid} ${newPlayer.name} joined.`);
        }
      }
      return game.players.sort(function(a, b) {
        return a.pid - b.pid;
      });
    }

    // console.log "Nono.update() complete: ", game

      // Helper: get player by pid from the game
    getPlayer(game, pid) {
      var i, len, player, ref;
      ref = game.players;
      for (i = 0, len = ref.length; i < len; i++) {
        player = ref[i];
        if (player.pid === pid) {
          return player;
        }
      }
      return null;
    }

    sendError(game, text) {
      game.error = text;
      game.errorCounter = (game.errorCounter + 1) % 256;
    }

    // Update game state based on incoming action packet
    action(game, pid, pkt) {
      var player;
      console.log(`Nono.action() pid ${pid}, pkt`, pkt);
      player = this.getPlayer(game, pid);
      if (player == null) {
        return;
      }
      if (pkt.action == null) {
        return;
      }
      switch (pkt.action) {
        case 'chooseLevel':
          if (pkt.name == null) {
            return;
          }
          if (constants.levels[pkt.name] == null) {
            return this.sendError(game, `Unknown level: ${pkt.name}`);
          }
          game.mode = 'game';
          game.level = pkt.name;
      }
    }

  };

  module.exports = Nono;

}).call(this);
