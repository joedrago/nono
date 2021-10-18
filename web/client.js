(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// ---------------------------------------------------------------------------------------
// Includes
var Screen, actionChooseLevel, calcGridMetrics, constants, errorCounter, errorTimeout, hideError, init, lastGridMetrics, lastView, onClick, onResize, pidToColor, render, renderError, renderGame, renderGrid, renderMenu, renderPlayerList, screen, socket, update;

constants = require('../constants');

Screen = require('./Screen');

// ---------------------------------------------------------------------------------------
// Globals
screen = null;

socket = null;

errorCounter = -1;

errorTimeout = null;

lastView = null;

lastGridMetrics = null;

// ---------------------------------------------------------------------------------------
// Render
pidToColor = function(pid) {
  return '#afa';
};

hideError = function() {
  return document.getElementById('error').style.display = 'none';
};

renderError = function(view) {
  if (errorCounter !== view.game.errorCounter) {
    errorCounter = view.game.errorCounter;
    if (errorTimeout != null) {
      clearTimeout(errorTimeout);
    }
    errorTimeout = setTimeout(hideError, 3000);
    document.getElementById('error').innerHTML = view.game.error;
    document.getElementById('error').style.display = 'block';
  }
};

renderPlayerList = function(view) {
  var fontSize, k, len, player, ref, results, x, y;
  fontSize = 16;
  x = 5;
  y = 5;
  ref = view.game.players;
  results = [];
  for (k = 0, len = ref.length; k < len; k++) {
    player = ref[k];
    screen.drawText(x, y, `Player ${player.pid}: ${player.name}`, fontSize, pidToColor(player.pid));
    results.push(y += fontSize);
  }
  return results;
};

renderMenu = function(view) {
  // html = """
  // <pre>
  // MENU
  // #{JSON.stringify(view, null, 2)}
  // <a onclick=\"actionChooseLevel('easy1')\">play easy1</a>
  // <a onclick=\"actionChooseLevel('easy5')\">play easy5</a>
  // </pre>
  // """
  // document.getElementById('main').innerHTML = html
  screen.fillRect(0, 0, screen.width, screen.height, '#f00');
  return renderPlayerList(view);
};

calcGridMetrics = function(view, gridX, gridY, dim) {
  var col, k, l, len, len1, m, maxCell, ref, ref1, row;
  m = {
    gridX: gridX,
    gridY: gridY,
    gridW: view.game.gridW,
    gridH: view.game.gridH,
    dim: dim,
    maxHints: 0
  };
  ref = view.game.gridHints.rows;
  for (k = 0, len = ref.length; k < len; k++) {
    row = ref[k];
    if (m.maxHints < row.length) {
      m.maxHints = row.length;
    }
  }
  ref1 = view.game.gridHints.cols;
  for (l = 0, len1 = ref1.length; l < len1; l++) {
    col = ref1[l];
    if (m.maxHints < col.length) {
      m.maxHints = col.length;
    }
  }
  maxCell = view.game.gridW;
  if (maxCell < view.game.gridH) {
    maxCell = view.game.gridH;
  }
  m.cellDim = Math.floor(dim / (maxCell + m.maxHints + 1));
  m.margin = Math.floor(m.cellDim / 4);
  m.hintColsOffsetX = gridX + (m.margin * 2) + (m.cellDim * m.maxHints);
  m.hintColsOffsetY = gridY + (m.margin * 1);
  m.hintRowsOffsetX = gridX + (m.margin * 1);
  m.hintRowsOffsetY = gridY + (m.margin * 2) + (m.cellDim * m.maxHints);
  m.cellOffsetX = gridX + (m.margin * 2) + (m.cellDim * m.maxHints);
  m.cellOffsetY = gridY + (m.margin * 2) + (m.cellDim * m.maxHints);
  console.log("calcGridMetrics: ", m);
  return m;
};

renderGrid = function(view, gridX, gridY, dim) {
  var col, colIndex, hint, hintCount, hintIndex, hintOffset, i, j, k, l, len, len1, len2, m, n, o, p, ref, ref1, ref2, ref3, results, row, rowIndex, x, y;
  console.log(`gridX ${gridX} gridY ${gridY} dim ${dim}`);
  m = calcGridMetrics(view, gridX, gridY, dim);
  lastGridMetrics = m;
  screen.fillRect(gridX, gridY, dim, dim, '#555');
  for (i = k = 0, ref = view.game.gridW; (0 <= ref ? k < ref : k > ref); i = 0 <= ref ? ++k : --k) {
    for (j = l = 0, ref1 = view.game.gridH; (0 <= ref1 ? l < ref1 : l > ref1); j = 0 <= ref1 ? ++l : --l) {
      x = m.cellOffsetX + (i * m.cellDim);
      y = m.cellOffsetY + (j * m.cellDim);
      screen.fillRect(x, y, m.cellDim, m.cellDim, '#888');
      screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#000');
    }
  }
  ref2 = view.game.gridHints.cols;
  for (colIndex = n = 0, len = ref2.length; n < len; colIndex = ++n) {
    col = ref2[colIndex];
    x = m.hintColsOffsetX + (colIndex * m.cellDim);
    hintCount = col.length;
    hintOffset = m.maxHints - hintCount;
    for (hintIndex = o = 0, len1 = col.length; o < len1; hintIndex = ++o) {
      hint = col[hintIndex];
      y = m.hintColsOffsetY + ((hintOffset + hintIndex) * m.cellDim);
      // screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#003')
      screen.drawTextCentered(x + (m.cellDim >> 1), y, String(hint), m.cellDim, '#fff');
    }
  }
  ref3 = view.game.gridHints.rows;
  results = [];
  for (rowIndex = p = 0, len2 = ref3.length; p < len2; rowIndex = ++p) {
    row = ref3[rowIndex];
    y = m.hintRowsOffsetY + (rowIndex * m.cellDim);
    hintCount = row.length;
    hintOffset = m.maxHints - hintCount;
    results.push((function() {
      var len3, q, results1;
      results1 = [];
      for (hintIndex = q = 0, len3 = row.length; q < len3; hintIndex = ++q) {
        hint = row[hintIndex];
        x = m.hintRowsOffsetX + ((hintOffset + hintIndex) * m.cellDim);
        // screen.drawRect(x, y, m.cellDim, m.cellDim, 2, '#003')
        results1.push(screen.drawTextCentered(x + (m.cellDim >> 1), y, String(hint), m.cellDim, '#fff'));
      }
      return results1;
    })());
  }
  return results;
};

renderGame = function(view) {
  var dim, gridX, gridY;
  screen.fillRect(0, 0, screen.width, screen.height, '#222');
  renderPlayerList(view);
  // Find a home for the grid, then draw it
  dim = screen.width;
  if (dim > screen.height) {
    dim = screen.height;
  }
  gridX = (screen.width - dim) >> 1;
  gridY = (screen.height - dim) >> 1;
  return renderGrid(view, gridX, gridY, dim);
};

render = function(view) {
  console.log("render");
  lastView = view;
  renderError(view);
  if (view.game.mode === 'menu') {
    return renderMenu(view);
  } else {
    return renderGame(view);
  }
};

onResize = function() {
  if (lastView != null) {
    return render(lastView);
  }
};

onClick = function(x, y, which) {
  var cellX, cellY;
  console.log(`onClick(${x}, ${y}, ${which})`);
  if (lastGridMetrics == null) {
    return;
  }
  if (x < lastGridMetrics.cellOffsetX) {
    return;
  }
  if (y < lastGridMetrics.cellOffsetY) {
    return;
  }
  cellX = Math.floor((x - lastGridMetrics.cellOffsetX) / lastGridMetrics.cellDim);
  cellY = Math.floor((y - lastGridMetrics.cellOffsetY) / lastGridMetrics.cellDim);
  if (cellX >= lastGridMetrics.gridW) {
    return;
  }
  if (cellY >= lastGridMetrics.gridH) {
    return;
  }
  return console.log(`cellX ${cellX}, cellY ${cellY}, which ${which}`);
};

// ---------------------------------------------------------------------------------------
// Actions
actionChooseLevel = function(levelName) {
  console.log(`actionChooseLevel: ${levelName}`);
  return socket.emit('action', {
    action: 'chooseLevel',
    name: levelName
  });
};

// ---------------------------------------------------------------------------------------
// Update
update = function(view) {
  return render(view);
};

// ---------------------------------------------------------------------------------------
// Init
init = function(s) {
  socket = s;
  window.actionChooseLevel = actionChooseLevel;
  return screen = new Screen('main', onResize, onClick);
};

// ---------------------------------------------------------------------------------------
module.exports = {
  init: init,
  update: update
};


},{"../constants":4,"./Screen":2}],2:[function(require,module,exports){
var Screen;

Screen = class Screen {
  constructor(htmlID, resizeCB, clickCB) {
    this.htmlID = htmlID;
    this.resizeCB = resizeCB;
    this.clickCB = clickCB;
    this.canvas = document.getElementById('main');
    this.context = this.canvas.getContext('2d');
    this.resizeToScreen();
    window.addEventListener('resize', this.onResize.bind(this), false);
    this.canvas.addEventListener('click', this.onClick.bind(this), false);
    this.canvas.addEventListener('contextmenu', this.onRightClick.bind(this), false);
  }

  resizeToScreen() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    return this.canvas.height = this.height;
  }

  onResize() {
    this.resizeToScreen();
    console.log(`onResize: ${this.width}x${this.height}`);
    if (this.resizeCB != null) {
      return this.resizeCB();
    }
  }

  onClick(ev) {
    var which, x, y;
    ev.preventDefault();
    x = ev.clientX;
    y = ev.clientY;
    which = 0;
    if (this.clickCB != null) {
      this.clickCB(x, y, which);
    }
    return false;
  }

  onRightClick(ev) {
    var which, x, y;
    ev.preventDefault();
    x = ev.clientX;
    y = ev.clientY;
    which = 1;
    if (this.clickCB != null) {
      this.clickCB(x, y, which);
    }
    return false;
  }

  fillRect(x, y, w, h, style) {
    this.context.beginPath();
    this.context.rect(x, y, w, h);
    this.context.lineWidth = 0;
    this.context.fillStyle = style;
    return this.context.fill();
  }

  drawRect(x, y, w, h, lineWidth, style) {
    this.context.beginPath();
    this.context.rect(x, y, w, h);
    this.context.lineWidth = lineWidth;
    this.context.strokeStyle = style;
    return this.context.stroke();
  }

  drawText(x, y, text, size, style) {
    this.context.font = `${size}px monospace`;
    this.context.lineWidth = 0;
    this.context.fillStyle = style;
    this.context.textBaseline = "top";
    this.context.textAlign = "left";
    return this.context.fillText(text, x, y);
  }

  drawTextCentered(x, y, text, size, style) {
    this.context.font = `${size}px monospace`;
    this.context.lineWidth = 0;
    this.context.fillStyle = style;
    this.context.textBaseline = "top";
    this.context.textAlign = "center";
    return this.context.fillText(text, x, y);
  }

};

module.exports = Screen;


},{}],3:[function(require,module,exports){
// ---------------------------------------------------------------------------------------
// Includes
var NonoClient, discordTag, init, logout, now, qs, receiveIdentity, receiveView, sendIdentity, sendView, serverEpoch, socket, spectatorMode, viewID;

NonoClient = require('./NonoClient');

// ---------------------------------------------------------------------------------------
// Globals
socket = null;

serverEpoch = null;

viewID = "";

discordTag = "";

spectatorMode = false;

// ---------------------------------------------------------------------------------------
// Helpers
now = function() {
  return Math.floor(Date.now() / 1000);
};

qs = function(name) {
  var regex, results, url;
  url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  results = regex.exec(url);
  if (!results || !results[2]) {
    return null;
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

// ---------------------------------------------------------------------------------------
// View
sendView = function() {
  var discordToken, viewPayload;
  discordToken = localStorage.getItem('token');
  viewPayload = {
    token: discordToken,
    vid: viewID,
    spectator: spectatorMode
  };
  console.log("Sending view: ", viewPayload);
  return socket.emit('view', viewPayload);
};

receiveView = function(pkt) {
  console.log("receiveView: ", pkt);
  return NonoClient.update(pkt);
};

// ---------------------------------------------------------------------------------------
// OAuth
logout = function() {
  document.getElementById("identity").innerHTML = "Logging out...";
  localStorage.removeItem('token');
  return sendIdentity();
};

sendIdentity = function() {
  var discordToken, identityPayload;
  discordToken = localStorage.getItem('token');
  identityPayload = {
    token: discordToken
  };
  console.log("Sending identify: ", identityPayload);
  return socket.emit('identify', identityPayload);
};

receiveIdentity = function(pkt) {
  var discordNickname, discordNicknameString, discordToken, html, loginLink, redirectURL;
  console.log("identify response:", pkt);
  if ((pkt.tag != null) && (pkt.tag.length > 0)) {
    discordTag = pkt.tag;
    discordNicknameString = "";
    if (pkt.nickname != null) {
      discordNickname = pkt.nickname;
      discordNicknameString = ` (${discordNickname})`;
    }
    html = `${discordTag}${discordNicknameString} - [<a onclick="logout()">Logout</a>]`;
  } else {
    discordTag = null;
    discordNickname = null;
    discordToken = null;
    redirectURL = String(window.location).replace(/\/[^\/]*$/, "/") + "oauth"; //+ "?vid=#{encodeURIComponent(viewID)}"
    console.log(`redirectURL ${redirectURL}`);
    loginLink = `https://discord.com/api/oauth2/authorize?client_id=${window.CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectURL)}&response_type=code&scope=identify`;
    html = `[<a href="${loginLink}">Login</a>]`;
  }
  document.getElementById("identity").innerHTML = html;
  return sendView();
};

// ---------------------------------------------------------------------------------------
// Init / Main
init = function() {
  var token;
  console.log("init");
  window.logout = logout;
  token = qs('token');
  if (token != null) {
    localStorage.setItem('token', token);
    window.location = '/';
    return;
  }
  viewID = qs('vid');
  console.log(`viewID ${viewID}`);
  spectatorMode = qs('spectator') != null;
  console.log(`spectatorMode ${spectatorMode}`);
  if (spectatorMode) {
    document.getElementById('identity').style.display = 'none';
  }
  socket = io();
  socket.on('connect', function() {
    return console.log(`socket ID: ${socket.id}`);
  });
  socket.on('server', function(server) {
    console.log('server message', server);
    if (serverEpoch != null) {
      if (serverEpoch !== server.epoch) {
        console.log("Server epoch changed! The server must have rebooted. Reloading...");
        socket.disconnect();
        location.reload();
        return;
      }
    } else {
      serverEpoch = server.epoch;
    }
    return sendIdentity();
  });
  socket.on('identify', function(pkt) {
    return receiveIdentity(pkt);
  });
  socket.on('view', function(pkt) {
    return receiveView(pkt);
  });
  socket.on('errortext', function(pkt) {
    document.getElementById("main").style.display = 'none';
    document.getElementById("errortext").style.display = 'block';
    return document.getElementById("errortext").innerHTML = pkt.text;
  });
  return NonoClient.init(socket);
};

window.onload = init;


},{"./NonoClient":1}],4:[function(require,module,exports){
module.exports = {
  levels: {
    "easy1": {
      id: 1,
      name: "easy1",
      title: "Easy Peasy"
    },
    "easy2": {
      id: 2,
      name: "easy2",
      title: "Easy Peasy"
    },
    "easy3": {
      id: 3,
      name: "easy1",
      title: "Easy Peasy"
    },
    "easy4": {
      id: 4,
      name: "easy1",
      title: "Easy Peasy"
    }
  }
};


},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L05vbm9DbGllbnQuY29mZmVlIiwic3JjL2NsaWVudC9TY3JlZW4uY29mZmVlIiwic3JjL2NsaWVudC9jbGllbnQuY29mZmVlIiwic3JjL2NvbnN0YW50cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNDVTs7QUFBQSxJQUFBLE1BQUEsRUFBQSxpQkFBQSxFQUFBLGVBQUEsRUFBQSxTQUFBLEVBQUEsWUFBQSxFQUFBLFlBQUEsRUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBLGVBQUEsRUFBQSxRQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsVUFBQSxFQUFBLFVBQUEsRUFBQSxnQkFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7O0FBRVYsU0FBQSxHQUFZLE9BQUEsQ0FBUSxjQUFSOztBQUNaLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUixFQUhDOzs7O0FBUVYsTUFBQSxHQUFTOztBQUNULE1BQUEsR0FBUzs7QUFDVCxZQUFBLEdBQWUsQ0FBQzs7QUFDaEIsWUFBQSxHQUFlOztBQUNmLFFBQUEsR0FBVzs7QUFDWCxlQUFBLEdBQWtCLEtBYlI7Ozs7QUFrQlYsVUFBQSxHQUFhLFFBQUEsQ0FBQyxHQUFELENBQUE7QUFDWCxTQUFPO0FBREk7O0FBR2IsU0FBQSxHQUFZLFFBQUEsQ0FBQSxDQUFBO1NBQ1YsUUFBUSxDQUFDLGNBQVQsQ0FBd0IsT0FBeEIsQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsT0FBdkMsR0FBaUQ7QUFEdkM7O0FBR1osV0FBQSxHQUFjLFFBQUEsQ0FBQyxJQUFELENBQUE7RUFDWixJQUFHLFlBQUEsS0FBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUE3QjtJQUNFLFlBQUEsR0FBZSxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3pCLElBQUcsb0JBQUg7TUFD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QXhCLENBQStCLENBQUMsS0FBSyxDQUFDLE9BQXRDLEdBQWdEO0lBQ2hELFFBQVEsQ0FBQyxjQUFULENBQXdCLFdBQXhCLENBQW9DLENBQUMsS0FBSyxDQUFDLE9BQTNDLEdBQXFEO1dBQ3JELFFBQVEsQ0FBQyxjQUFULENBQXdCLFdBQXhCLENBQW9DLENBQUMsU0FBckMsR0FBaUQsR0FBRyxDQUFDO0VBSGhDLENBQXZCO1NBS0EsVUFBVSxDQUFDLElBQVgsQ0FBZ0IsTUFBaEI7QUF6Q0s7O0FBMkNQLE1BQU0sQ0FBQyxNQUFQLEdBQWdCOzs7O0FDckloQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsTUFBQSxFQUNFO0lBQUEsT0FBQSxFQUFTO01BQ1AsRUFBQSxFQUFJLENBREc7TUFFUCxJQUFBLEVBQU0sT0FGQztNQUdQLEtBQUEsRUFBTztJQUhBLENBQVQ7SUFLQSxPQUFBLEVBQVM7TUFDUCxFQUFBLEVBQUksQ0FERztNQUVQLElBQUEsRUFBTSxPQUZDO01BR1AsS0FBQSxFQUFPO0lBSEEsQ0FMVDtJQVVBLE9BQUEsRUFBUztNQUNQLEVBQUEsRUFBSSxDQURHO01BRVAsSUFBQSxFQUFNLE9BRkM7TUFHUCxLQUFBLEVBQU87SUFIQSxDQVZUO0lBZUEsT0FBQSxFQUFTO01BQ1AsRUFBQSxFQUFJLENBREc7TUFFUCxJQUFBLEVBQU0sT0FGQztNQUdQLEtBQUEsRUFBTztJQUhBO0VBZlQ7QUFERiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSW5jbHVkZXNcclxuXHJcbmNvbnN0YW50cyA9IHJlcXVpcmUgJy4uL2NvbnN0YW50cydcclxuU2NyZWVuID0gcmVxdWlyZSAnLi9TY3JlZW4nXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIEdsb2JhbHNcclxuXHJcbnNjcmVlbiA9IG51bGxcclxuc29ja2V0ID0gbnVsbFxyXG5lcnJvckNvdW50ZXIgPSAtMVxyXG5lcnJvclRpbWVvdXQgPSBudWxsXHJcbmxhc3RWaWV3ID0gbnVsbFxyXG5sYXN0R3JpZE1ldHJpY3MgPSBudWxsXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIFJlbmRlclxyXG5cclxucGlkVG9Db2xvciA9IChwaWQpIC0+XHJcbiAgcmV0dXJuICcjYWZhJ1xyXG5cclxuaGlkZUVycm9yID0gLT5cclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3InKS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXHJcblxyXG5yZW5kZXJFcnJvciA9ICh2aWV3KSAtPlxyXG4gIGlmIGVycm9yQ291bnRlciAhPSB2aWV3LmdhbWUuZXJyb3JDb3VudGVyXHJcbiAgICBlcnJvckNvdW50ZXIgPSB2aWV3LmdhbWUuZXJyb3JDb3VudGVyXHJcbiAgICBpZiBlcnJvclRpbWVvdXQ/XHJcbiAgICAgIGNsZWFyVGltZW91dChlcnJvclRpbWVvdXQpXHJcbiAgICBlcnJvclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVFcnJvciwgMzAwMClcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcicpLmlubmVySFRNTCA9IHZpZXcuZ2FtZS5lcnJvclxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Vycm9yJykuc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuICByZXR1cm5cclxuXHJcbnJlbmRlclBsYXllckxpc3QgPSAodmlldykgLT5cclxuICBmb250U2l6ZSA9IDE2XHJcbiAgeCA9IDVcclxuICB5ID0gNVxyXG4gIGZvciBwbGF5ZXIgaW4gdmlldy5nYW1lLnBsYXllcnNcclxuICAgIHNjcmVlbi5kcmF3VGV4dCh4LCB5LCBcIlBsYXllciAje3BsYXllci5waWR9OiAje3BsYXllci5uYW1lfVwiLCBmb250U2l6ZSwgcGlkVG9Db2xvcihwbGF5ZXIucGlkKSlcclxuICAgIHkgKz0gZm9udFNpemVcclxuXHJcbnJlbmRlck1lbnUgPSAodmlldykgLT5cclxuICAjIGh0bWwgPSBcIlwiXCJcclxuICAjIDxwcmU+XHJcbiAgIyBNRU5VXHJcbiAgIyAje0pTT04uc3RyaW5naWZ5KHZpZXcsIG51bGwsIDIpfVxyXG4gICMgPGEgb25jbGljaz1cXFwiYWN0aW9uQ2hvb3NlTGV2ZWwoJ2Vhc3kxJylcXFwiPnBsYXkgZWFzeTE8L2E+XHJcbiAgIyA8YSBvbmNsaWNrPVxcXCJhY3Rpb25DaG9vc2VMZXZlbCgnZWFzeTUnKVxcXCI+cGxheSBlYXN5NTwvYT5cclxuICAjIDwvcHJlPlxyXG4gICMgXCJcIlwiXHJcbiAgIyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbicpLmlubmVySFRNTCA9IGh0bWxcclxuICBzY3JlZW4uZmlsbFJlY3QoMCwgMCwgc2NyZWVuLndpZHRoLCBzY3JlZW4uaGVpZ2h0LCAnI2YwMCcpXHJcbiAgcmVuZGVyUGxheWVyTGlzdCh2aWV3KVxyXG5cclxuY2FsY0dyaWRNZXRyaWNzID0gKHZpZXcsIGdyaWRYLCBncmlkWSwgZGltKSAtPlxyXG4gIG0gPVxyXG4gICAgZ3JpZFg6IGdyaWRYXHJcbiAgICBncmlkWTogZ3JpZFlcclxuICAgIGdyaWRXOiB2aWV3LmdhbWUuZ3JpZFdcclxuICAgIGdyaWRIOiB2aWV3LmdhbWUuZ3JpZEhcclxuICAgIGRpbTogZGltXHJcbiAgICBtYXhIaW50czogMFxyXG4gIGZvciByb3cgaW4gdmlldy5nYW1lLmdyaWRIaW50cy5yb3dzXHJcbiAgICBpZiBtLm1heEhpbnRzIDwgcm93Lmxlbmd0aFxyXG4gICAgICBtLm1heEhpbnRzID0gcm93Lmxlbmd0aFxyXG4gIGZvciBjb2wgaW4gdmlldy5nYW1lLmdyaWRIaW50cy5jb2xzXHJcbiAgICBpZiBtLm1heEhpbnRzIDwgY29sLmxlbmd0aFxyXG4gICAgICBtLm1heEhpbnRzID0gY29sLmxlbmd0aFxyXG5cclxuICBtYXhDZWxsID0gdmlldy5nYW1lLmdyaWRXXHJcbiAgaWYgbWF4Q2VsbCA8IHZpZXcuZ2FtZS5ncmlkSFxyXG4gICAgbWF4Q2VsbCA9IHZpZXcuZ2FtZS5ncmlkSFxyXG5cclxuICBtLmNlbGxEaW0gPSBNYXRoLmZsb29yKGRpbSAvIChtYXhDZWxsICsgbS5tYXhIaW50cyArIDEpKVxyXG4gIG0ubWFyZ2luID0gTWF0aC5mbG9vcihtLmNlbGxEaW0gLyA0KVxyXG5cclxuICBtLmhpbnRDb2xzT2Zmc2V0WCA9IGdyaWRYICsgKG0ubWFyZ2luICogMikgKyAobS5jZWxsRGltICogbS5tYXhIaW50cylcclxuICBtLmhpbnRDb2xzT2Zmc2V0WSA9IGdyaWRZICsgKG0ubWFyZ2luICogMSlcclxuXHJcbiAgbS5oaW50Um93c09mZnNldFggPSBncmlkWCArIChtLm1hcmdpbiAqIDEpXHJcbiAgbS5oaW50Um93c09mZnNldFkgPSBncmlkWSArIChtLm1hcmdpbiAqIDIpICsgKG0uY2VsbERpbSAqIG0ubWF4SGludHMpXHJcblxyXG4gIG0uY2VsbE9mZnNldFggPSBncmlkWCArIChtLm1hcmdpbiAqIDIpICsgKG0uY2VsbERpbSAqIG0ubWF4SGludHMpXHJcbiAgbS5jZWxsT2Zmc2V0WSA9IGdyaWRZICsgKG0ubWFyZ2luICogMikgKyAobS5jZWxsRGltICogbS5tYXhIaW50cylcclxuXHJcbiAgY29uc29sZS5sb2cgXCJjYWxjR3JpZE1ldHJpY3M6IFwiLCBtXHJcbiAgcmV0dXJuIG1cclxuXHJcbnJlbmRlckdyaWQgPSAodmlldywgZ3JpZFgsIGdyaWRZLCBkaW0pIC0+XHJcbiAgY29uc29sZS5sb2cgXCJncmlkWCAje2dyaWRYfSBncmlkWSAje2dyaWRZfSBkaW0gI3tkaW19XCJcclxuICBtID0gY2FsY0dyaWRNZXRyaWNzKHZpZXcsIGdyaWRYLCBncmlkWSwgZGltKVxyXG4gIGxhc3RHcmlkTWV0cmljcyA9IG1cclxuICBzY3JlZW4uZmlsbFJlY3QoZ3JpZFgsIGdyaWRZLCBkaW0sIGRpbSwgJyM1NTUnKVxyXG5cclxuICBmb3IgaSBpbiBbMC4uLnZpZXcuZ2FtZS5ncmlkV11cclxuICAgIGZvciBqIGluIFswLi4udmlldy5nYW1lLmdyaWRIXVxyXG4gICAgICB4ID0gbS5jZWxsT2Zmc2V0WCArIChpICogbS5jZWxsRGltKVxyXG4gICAgICB5ID0gbS5jZWxsT2Zmc2V0WSArIChqICogbS5jZWxsRGltKVxyXG4gICAgICBzY3JlZW4uZmlsbFJlY3QoeCwgeSwgbS5jZWxsRGltLCBtLmNlbGxEaW0sICcjODg4JylcclxuICAgICAgc2NyZWVuLmRyYXdSZWN0KHgsIHksIG0uY2VsbERpbSwgbS5jZWxsRGltLCAyLCAnIzAwMCcpXHJcblxyXG4gIGZvciBjb2wsIGNvbEluZGV4IGluIHZpZXcuZ2FtZS5ncmlkSGludHMuY29sc1xyXG4gICAgeCA9IG0uaGludENvbHNPZmZzZXRYICsgKGNvbEluZGV4ICogbS5jZWxsRGltKVxyXG4gICAgaGludENvdW50ID0gY29sLmxlbmd0aFxyXG4gICAgaGludE9mZnNldCA9IG0ubWF4SGludHMgLSBoaW50Q291bnRcclxuICAgIGZvciBoaW50LCBoaW50SW5kZXggaW4gY29sXHJcbiAgICAgIHkgPSBtLmhpbnRDb2xzT2Zmc2V0WSArICgoaGludE9mZnNldCArIGhpbnRJbmRleCkgKiBtLmNlbGxEaW0pXHJcbiAgICAgICMgc2NyZWVuLmRyYXdSZWN0KHgsIHksIG0uY2VsbERpbSwgbS5jZWxsRGltLCAyLCAnIzAwMycpXHJcbiAgICAgIHNjcmVlbi5kcmF3VGV4dENlbnRlcmVkKHggKyAobS5jZWxsRGltID4+IDEpLCB5LCBTdHJpbmcoaGludCksIG0uY2VsbERpbSwgJyNmZmYnKVxyXG5cclxuICBmb3Igcm93LCByb3dJbmRleCBpbiB2aWV3LmdhbWUuZ3JpZEhpbnRzLnJvd3NcclxuICAgIHkgPSBtLmhpbnRSb3dzT2Zmc2V0WSArIChyb3dJbmRleCAqIG0uY2VsbERpbSlcclxuICAgIGhpbnRDb3VudCA9IHJvdy5sZW5ndGhcclxuICAgIGhpbnRPZmZzZXQgPSBtLm1heEhpbnRzIC0gaGludENvdW50XHJcbiAgICBmb3IgaGludCwgaGludEluZGV4IGluIHJvd1xyXG4gICAgICB4ID0gbS5oaW50Um93c09mZnNldFggKyAoKGhpbnRPZmZzZXQgKyBoaW50SW5kZXgpICogbS5jZWxsRGltKVxyXG4gICAgICAjIHNjcmVlbi5kcmF3UmVjdCh4LCB5LCBtLmNlbGxEaW0sIG0uY2VsbERpbSwgMiwgJyMwMDMnKVxyXG4gICAgICBzY3JlZW4uZHJhd1RleHRDZW50ZXJlZCh4ICsgKG0uY2VsbERpbSA+PiAxKSwgeSwgU3RyaW5nKGhpbnQpLCBtLmNlbGxEaW0sICcjZmZmJylcclxuXHJcbnJlbmRlckdhbWUgPSAodmlldykgLT5cclxuICBzY3JlZW4uZmlsbFJlY3QoMCwgMCwgc2NyZWVuLndpZHRoLCBzY3JlZW4uaGVpZ2h0LCAnIzIyMicpXHJcbiAgcmVuZGVyUGxheWVyTGlzdCh2aWV3KVxyXG5cclxuICAjIEZpbmQgYSBob21lIGZvciB0aGUgZ3JpZCwgdGhlbiBkcmF3IGl0XHJcbiAgZGltID0gc2NyZWVuLndpZHRoXHJcbiAgaWYgZGltID4gc2NyZWVuLmhlaWdodFxyXG4gICAgZGltID0gc2NyZWVuLmhlaWdodFxyXG4gIGdyaWRYID0gKHNjcmVlbi53aWR0aCAtIGRpbSkgPj4gMVxyXG4gIGdyaWRZID0gKHNjcmVlbi5oZWlnaHQgLSBkaW0pID4+IDFcclxuICByZW5kZXJHcmlkKHZpZXcsIGdyaWRYLCBncmlkWSwgZGltKVxyXG5cclxucmVuZGVyID0gKHZpZXcpIC0+XHJcbiAgY29uc29sZS5sb2cgXCJyZW5kZXJcIlxyXG4gIGxhc3RWaWV3ID0gdmlld1xyXG4gIHJlbmRlckVycm9yKHZpZXcpXHJcbiAgaWYgdmlldy5nYW1lLm1vZGUgPT0gJ21lbnUnXHJcbiAgICByZW5kZXJNZW51KHZpZXcpXHJcbiAgZWxzZVxyXG4gICAgcmVuZGVyR2FtZSh2aWV3KVxyXG5cclxub25SZXNpemUgPSAtPlxyXG4gIGlmIGxhc3RWaWV3P1xyXG4gICAgcmVuZGVyKGxhc3RWaWV3KVxyXG5cclxub25DbGljayA9ICh4LCB5LCB3aGljaCktPlxyXG4gIGNvbnNvbGUubG9nIFwib25DbGljaygje3h9LCAje3l9LCAje3doaWNofSlcIlxyXG4gIGlmIG5vdCBsYXN0R3JpZE1ldHJpY3M/XHJcbiAgICByZXR1cm5cclxuXHJcbiAgaWYgeCA8IGxhc3RHcmlkTWV0cmljcy5jZWxsT2Zmc2V0WFxyXG4gICAgcmV0dXJuXHJcbiAgaWYgeSA8IGxhc3RHcmlkTWV0cmljcy5jZWxsT2Zmc2V0WVxyXG4gICAgcmV0dXJuXHJcblxyXG4gIGNlbGxYID0gTWF0aC5mbG9vcigoeCAtIGxhc3RHcmlkTWV0cmljcy5jZWxsT2Zmc2V0WCkgLyBsYXN0R3JpZE1ldHJpY3MuY2VsbERpbSlcclxuICBjZWxsWSA9IE1hdGguZmxvb3IoKHkgLSBsYXN0R3JpZE1ldHJpY3MuY2VsbE9mZnNldFkpIC8gbGFzdEdyaWRNZXRyaWNzLmNlbGxEaW0pXHJcbiAgaWYgY2VsbFggPj0gbGFzdEdyaWRNZXRyaWNzLmdyaWRXXHJcbiAgICByZXR1cm5cclxuICBpZiBjZWxsWSA+PSBsYXN0R3JpZE1ldHJpY3MuZ3JpZEhcclxuICAgIHJldHVyblxyXG4gIGNvbnNvbGUubG9nIFwiY2VsbFggI3tjZWxsWH0sIGNlbGxZICN7Y2VsbFl9LCB3aGljaCAje3doaWNofVwiXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIEFjdGlvbnNcclxuXHJcbmFjdGlvbkNob29zZUxldmVsID0gKGxldmVsTmFtZSkgLT5cclxuICBjb25zb2xlLmxvZyBcImFjdGlvbkNob29zZUxldmVsOiAje2xldmVsTmFtZX1cIlxyXG4gIHNvY2tldC5lbWl0ICdhY3Rpb24nLCB7XHJcbiAgICBhY3Rpb246ICdjaG9vc2VMZXZlbCdcclxuICAgIG5hbWU6IGxldmVsTmFtZVxyXG4gIH1cclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgVXBkYXRlXHJcblxyXG51cGRhdGUgPSAodmlldykgLT5cclxuICByZW5kZXIodmlldylcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSW5pdFxyXG5cclxuaW5pdCA9IChzKSAtPlxyXG4gIHNvY2tldCA9IHNcclxuXHJcbiAgd2luZG93LmFjdGlvbkNob29zZUxldmVsID0gYWN0aW9uQ2hvb3NlTGV2ZWxcclxuXHJcbiAgc2NyZWVuID0gbmV3IFNjcmVlbignbWFpbicsIG9uUmVzaXplLCBvbkNsaWNrKVxyXG5cclxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBpbml0OiBpbml0XHJcbiAgdXBkYXRlOiB1cGRhdGVcclxuIiwiY2xhc3MgU2NyZWVuXHJcbiAgY29uc3RydWN0b3I6IChAaHRtbElELCBAcmVzaXplQ0IsIEBjbGlja0NCKSAtPlxyXG4gICAgQGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluJylcclxuICAgIEBjb250ZXh0ID0gQGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXHJcbiAgICBAcmVzaXplVG9TY3JlZW4oKVxyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBAb25SZXNpemUuYmluZCh0aGlzKSwgZmFsc2UpXHJcbiAgICBAY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgQG9uQ2xpY2suYmluZCh0aGlzKSwgZmFsc2UpXHJcbiAgICBAY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgQG9uUmlnaHRDbGljay5iaW5kKHRoaXMpLCBmYWxzZSlcclxuXHJcbiAgcmVzaXplVG9TY3JlZW46IC0+XHJcbiAgICBAd2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aFxyXG4gICAgQGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodFxyXG4gICAgQGNhbnZhcy53aWR0aCA9IEB3aWR0aFxyXG4gICAgQGNhbnZhcy5oZWlnaHQgPSBAaGVpZ2h0XHJcblxyXG4gIG9uUmVzaXplOiAtPlxyXG4gICAgQHJlc2l6ZVRvU2NyZWVuKClcclxuICAgIGNvbnNvbGUubG9nIFwib25SZXNpemU6ICN7QHdpZHRofXgje0BoZWlnaHR9XCJcclxuICAgIGlmIEByZXNpemVDQj9cclxuICAgICAgQHJlc2l6ZUNCKClcclxuXHJcbiAgb25DbGljazogKGV2KSAtPlxyXG4gICAgZXYucHJldmVudERlZmF1bHQoKVxyXG4gICAgeCA9IGV2LmNsaWVudFhcclxuICAgIHkgPSBldi5jbGllbnRZXHJcbiAgICB3aGljaCA9IDBcclxuICAgIGlmIEBjbGlja0NCP1xyXG4gICAgICBAY2xpY2tDQih4LCB5LCB3aGljaClcclxuICAgIHJldHVybiBmYWxzZVxyXG5cclxuICBvblJpZ2h0Q2xpY2s6IChldikgLT5cclxuICAgIGV2LnByZXZlbnREZWZhdWx0KClcclxuICAgIHggPSBldi5jbGllbnRYXHJcbiAgICB5ID0gZXYuY2xpZW50WVxyXG4gICAgd2hpY2ggPSAxXHJcbiAgICBpZiBAY2xpY2tDQj9cclxuICAgICAgQGNsaWNrQ0IoeCwgeSwgd2hpY2gpXHJcbiAgICByZXR1cm4gZmFsc2VcclxuXHJcbiAgZmlsbFJlY3Q6ICh4LCB5LCB3LCBoLCBzdHlsZSkgLT5cclxuICAgIEBjb250ZXh0LmJlZ2luUGF0aCgpXHJcbiAgICBAY29udGV4dC5yZWN0KHgsIHksIHcsIGgpXHJcbiAgICBAY29udGV4dC5saW5lV2lkdGggPSAwXHJcbiAgICBAY29udGV4dC5maWxsU3R5bGUgPSBzdHlsZVxyXG4gICAgQGNvbnRleHQuZmlsbCgpXHJcblxyXG4gIGRyYXdSZWN0OiAoeCwgeSwgdywgaCwgbGluZVdpZHRoLCBzdHlsZSkgLT5cclxuICAgIEBjb250ZXh0LmJlZ2luUGF0aCgpXHJcbiAgICBAY29udGV4dC5yZWN0KHgsIHksIHcsIGgpXHJcbiAgICBAY29udGV4dC5saW5lV2lkdGggPSBsaW5lV2lkdGhcclxuICAgIEBjb250ZXh0LnN0cm9rZVN0eWxlID0gc3R5bGVcclxuICAgIEBjb250ZXh0LnN0cm9rZSgpXHJcblxyXG4gIGRyYXdUZXh0OiAoeCwgeSwgdGV4dCwgc2l6ZSwgc3R5bGUpIC0+XHJcbiAgICBAY29udGV4dC5mb250ID0gXCIje3NpemV9cHggbW9ub3NwYWNlXCJcclxuICAgIEBjb250ZXh0LmxpbmVXaWR0aCA9IDBcclxuICAgIEBjb250ZXh0LmZpbGxTdHlsZSA9IHN0eWxlXHJcbiAgICBAY29udGV4dC50ZXh0QmFzZWxpbmUgPSBcInRvcFwiXHJcbiAgICBAY29udGV4dC50ZXh0QWxpZ24gPSBcImxlZnRcIlxyXG4gICAgQGNvbnRleHQuZmlsbFRleHQodGV4dCwgeCwgeSk7XHJcblxyXG4gIGRyYXdUZXh0Q2VudGVyZWQ6ICh4LCB5LCB0ZXh0LCBzaXplLCBzdHlsZSkgLT5cclxuICAgIEBjb250ZXh0LmZvbnQgPSBcIiN7c2l6ZX1weCBtb25vc3BhY2VcIlxyXG4gICAgQGNvbnRleHQubGluZVdpZHRoID0gMFxyXG4gICAgQGNvbnRleHQuZmlsbFN0eWxlID0gc3R5bGVcclxuICAgIEBjb250ZXh0LnRleHRCYXNlbGluZSA9IFwidG9wXCJcclxuICAgIEBjb250ZXh0LnRleHRBbGlnbiA9IFwiY2VudGVyXCJcclxuICAgIEBjb250ZXh0LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY3JlZW5cclxuIiwiIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIyBJbmNsdWRlc1xyXG5cclxuTm9ub0NsaWVudCA9IHJlcXVpcmUgJy4vTm9ub0NsaWVudCdcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgR2xvYmFsc1xyXG5cclxuc29ja2V0ID0gbnVsbFxyXG5zZXJ2ZXJFcG9jaCA9IG51bGxcclxudmlld0lEID0gXCJcIlxyXG5kaXNjb3JkVGFnID0gXCJcIlxyXG5zcGVjdGF0b3JNb2RlID0gZmFsc2VcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSGVscGVyc1xyXG5cclxubm93ID0gLT5cclxuICByZXR1cm4gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuXHJcbnFzID0gKG5hbWUpIC0+XHJcbiAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWZcclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXFxdXS9nLCAnXFxcXCQmJylcclxuICByZWdleCA9IG5ldyBSZWdFeHAoJ1s/Jl0nICsgbmFtZSArICcoPShbXiYjXSopfCZ8I3wkKScpXHJcbiAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcclxuICBpZiBub3QgcmVzdWx0cyBvciBub3QgcmVzdWx0c1syXVxyXG4gICAgcmV0dXJuIG51bGxcclxuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csICcgJykpXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIFZpZXdcclxuXHJcbnNlbmRWaWV3ID0gLT5cclxuICBkaXNjb3JkVG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndG9rZW4nKVxyXG4gIHZpZXdQYXlsb2FkID0ge1xyXG4gICAgdG9rZW46IGRpc2NvcmRUb2tlblxyXG4gICAgdmlkOiB2aWV3SURcclxuICAgIHNwZWN0YXRvcjogc3BlY3RhdG9yTW9kZVxyXG4gIH1cclxuICBjb25zb2xlLmxvZyBcIlNlbmRpbmcgdmlldzogXCIsIHZpZXdQYXlsb2FkXHJcbiAgc29ja2V0LmVtaXQgJ3ZpZXcnLCB2aWV3UGF5bG9hZFxyXG5cclxucmVjZWl2ZVZpZXcgPSAocGt0KSAtPlxyXG4gIGNvbnNvbGUubG9nIFwicmVjZWl2ZVZpZXc6IFwiLCBwa3RcclxuICBOb25vQ2xpZW50LnVwZGF0ZShwa3QpXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIE9BdXRoXHJcblxyXG5sb2dvdXQgPSAtPlxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaWRlbnRpdHlcIikuaW5uZXJIVE1MID0gXCJMb2dnaW5nIG91dC4uLlwiXHJcbiAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3Rva2VuJylcclxuICBzZW5kSWRlbnRpdHkoKVxyXG5cclxuc2VuZElkZW50aXR5ID0gLT5cclxuICBkaXNjb3JkVG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgndG9rZW4nKVxyXG4gIGlkZW50aXR5UGF5bG9hZCA9IHtcclxuICAgIHRva2VuOiBkaXNjb3JkVG9rZW5cclxuICB9XHJcbiAgY29uc29sZS5sb2cgXCJTZW5kaW5nIGlkZW50aWZ5OiBcIiwgaWRlbnRpdHlQYXlsb2FkXHJcbiAgc29ja2V0LmVtaXQgJ2lkZW50aWZ5JywgaWRlbnRpdHlQYXlsb2FkXHJcblxyXG5yZWNlaXZlSWRlbnRpdHkgPSAocGt0KSAtPlxyXG4gIGNvbnNvbGUubG9nIFwiaWRlbnRpZnkgcmVzcG9uc2U6XCIsIHBrdFxyXG4gIGlmIHBrdC50YWc/IGFuZCAocGt0LnRhZy5sZW5ndGggPiAwKVxyXG4gICAgZGlzY29yZFRhZyA9IHBrdC50YWdcclxuICAgIGRpc2NvcmROaWNrbmFtZVN0cmluZyA9IFwiXCJcclxuICAgIGlmIHBrdC5uaWNrbmFtZT9cclxuICAgICAgZGlzY29yZE5pY2tuYW1lID0gcGt0Lm5pY2tuYW1lXHJcbiAgICAgIGRpc2NvcmROaWNrbmFtZVN0cmluZyA9IFwiICgje2Rpc2NvcmROaWNrbmFtZX0pXCJcclxuICAgIGh0bWwgPSBcIlwiXCJcclxuICAgICAgI3tkaXNjb3JkVGFnfSN7ZGlzY29yZE5pY2tuYW1lU3RyaW5nfSAtIFs8YSBvbmNsaWNrPVwibG9nb3V0KClcIj5Mb2dvdXQ8L2E+XVxyXG4gICAgXCJcIlwiXHJcbiAgZWxzZVxyXG4gICAgZGlzY29yZFRhZyA9IG51bGxcclxuICAgIGRpc2NvcmROaWNrbmFtZSA9IG51bGxcclxuICAgIGRpc2NvcmRUb2tlbiA9IG51bGxcclxuXHJcbiAgICByZWRpcmVjdFVSTCA9IFN0cmluZyh3aW5kb3cubG9jYXRpb24pLnJlcGxhY2UoL1xcL1teXFwvXSokLywgXCIvXCIpICsgXCJvYXV0aFwiICMrIFwiP3ZpZD0je2VuY29kZVVSSUNvbXBvbmVudCh2aWV3SUQpfVwiXHJcbiAgICBjb25zb2xlLmxvZyBcInJlZGlyZWN0VVJMICN7cmVkaXJlY3RVUkx9XCJcclxuICAgIGxvZ2luTGluayA9IFwiaHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvb2F1dGgyL2F1dGhvcml6ZT9jbGllbnRfaWQ9I3t3aW5kb3cuQ0xJRU5UX0lEfSZyZWRpcmVjdF91cmk9I3tlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVUkwpfSZyZXNwb25zZV90eXBlPWNvZGUmc2NvcGU9aWRlbnRpZnlcIlxyXG4gICAgaHRtbCA9IFwiXCJcIlxyXG4gICAgICBbPGEgaHJlZj1cIiN7bG9naW5MaW5rfVwiPkxvZ2luPC9hPl1cclxuICAgIFwiXCJcIlxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaWRlbnRpdHlcIikuaW5uZXJIVE1MID0gaHRtbFxyXG4gIHNlbmRWaWV3KClcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSW5pdCAvIE1haW5cclxuXHJcbmluaXQgPSAtPlxyXG4gIGNvbnNvbGUubG9nIFwiaW5pdFwiXHJcbiAgd2luZG93LmxvZ291dCA9IGxvZ291dFxyXG5cclxuICB0b2tlbiA9IHFzKCd0b2tlbicpXHJcbiAgaWYgdG9rZW4/XHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndG9rZW4nLCB0b2tlbilcclxuICAgIHdpbmRvdy5sb2NhdGlvbiA9ICcvJ1xyXG4gICAgcmV0dXJuXHJcblxyXG4gIHZpZXdJRCA9IHFzKCd2aWQnKVxyXG4gIGNvbnNvbGUubG9nIFwidmlld0lEICN7dmlld0lEfVwiXHJcbiAgc3BlY3RhdG9yTW9kZSA9IHFzKCdzcGVjdGF0b3InKT9cclxuICBjb25zb2xlLmxvZyBcInNwZWN0YXRvck1vZGUgI3tzcGVjdGF0b3JNb2RlfVwiXHJcblxyXG4gIGlmIHNwZWN0YXRvck1vZGVcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpZGVudGl0eScpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcclxuXHJcbiAgc29ja2V0ID0gaW8oKVxyXG4gIHNvY2tldC5vbiAnY29ubmVjdCcsIC0+XHJcbiAgICBjb25zb2xlLmxvZyBcInNvY2tldCBJRDogI3tzb2NrZXQuaWR9XCJcclxuICBzb2NrZXQub24gJ3NlcnZlcicsIChzZXJ2ZXIpIC0+XHJcbiAgICBjb25zb2xlLmxvZyAnc2VydmVyIG1lc3NhZ2UnLCBzZXJ2ZXJcclxuICAgIGlmIHNlcnZlckVwb2NoP1xyXG4gICAgICBpZiBzZXJ2ZXJFcG9jaCAhPSBzZXJ2ZXIuZXBvY2hcclxuICAgICAgICBjb25zb2xlLmxvZyBcIlNlcnZlciBlcG9jaCBjaGFuZ2VkISBUaGUgc2VydmVyIG11c3QgaGF2ZSByZWJvb3RlZC4gUmVsb2FkaW5nLi4uXCJcclxuICAgICAgICBzb2NrZXQuZGlzY29ubmVjdCgpXHJcbiAgICAgICAgbG9jYXRpb24ucmVsb2FkKClcclxuICAgICAgICByZXR1cm5cclxuICAgIGVsc2VcclxuICAgICAgc2VydmVyRXBvY2ggPSBzZXJ2ZXIuZXBvY2hcclxuICAgIHNlbmRJZGVudGl0eSgpXHJcbiAgc29ja2V0Lm9uICdpZGVudGlmeScsIChwa3QpIC0+XHJcbiAgICByZWNlaXZlSWRlbnRpdHkocGt0KVxyXG4gIHNvY2tldC5vbiAndmlldycsIChwa3QpIC0+XHJcbiAgICByZWNlaXZlVmlldyhwa3QpXHJcbiAgc29ja2V0Lm9uICdlcnJvcnRleHQnLCAocGt0KSAtPlxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluXCIpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXJyb3J0ZXh0XCIpLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVycm9ydGV4dFwiKS5pbm5lckhUTUwgPSBwa3QudGV4dFxyXG5cclxuICBOb25vQ2xpZW50LmluaXQoc29ja2V0KVxyXG5cclxud2luZG93Lm9ubG9hZCA9IGluaXRcclxuIiwibW9kdWxlLmV4cG9ydHMgPVxyXG4gIGxldmVsczpcclxuICAgIFwiZWFzeTFcIjoge1xyXG4gICAgICBpZDogMVxyXG4gICAgICBuYW1lOiBcImVhc3kxXCJcclxuICAgICAgdGl0bGU6IFwiRWFzeSBQZWFzeVwiXHJcbiAgICB9XHJcbiAgICBcImVhc3kyXCI6IHtcclxuICAgICAgaWQ6IDJcclxuICAgICAgbmFtZTogXCJlYXN5MlwiXHJcbiAgICAgIHRpdGxlOiBcIkVhc3kgUGVhc3lcIlxyXG4gICAgfVxyXG4gICAgXCJlYXN5M1wiOiB7XHJcbiAgICAgIGlkOiAzXHJcbiAgICAgIG5hbWU6IFwiZWFzeTFcIlxyXG4gICAgICB0aXRsZTogXCJFYXN5IFBlYXN5XCJcclxuICAgIH1cclxuICAgIFwiZWFzeTRcIjoge1xyXG4gICAgICBpZDogNFxyXG4gICAgICBuYW1lOiBcImVhc3kxXCJcclxuICAgICAgdGl0bGU6IFwiRWFzeSBQZWFzeVwiXHJcbiAgICB9XHJcbiJdfQ==
