(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// ---------------------------------------------------------------------------------------
// Includes
var actionChooseLevel, constants, errorCounter, errorTimeout, hideError, init, render, renderError, renderGame, renderMenu, socket, update;

constants = require('../constants');

// ---------------------------------------------------------------------------------------
// Globals
socket = null;

errorCounter = -1;

errorTimeout = null;

// ---------------------------------------------------------------------------------------
// Render
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

renderMenu = function(view) {
  var html;
  html = `<pre>
MENU
${JSON.stringify(view, null, 2)}
<a onclick=\"actionChooseLevel('easy1')\">play easy1</a>
<a onclick=\"actionChooseLevel('easy5')\">play easy5</a>
</pre>`;
  return document.getElementById('main').innerHTML = html;
};

renderGame = function(view) {
  var html;
  html = `<pre>
GAME
${JSON.stringify(view, null, 2)}
</pre>`;
  return document.getElementById('main').innerHTML = html;
};

render = function(view) {
  renderError(view);
  if (view.game.mode === 'menu') {
    return renderMenu(view);
  } else {
    return renderGame(view);
  }
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
  return window.actionChooseLevel = actionChooseLevel;
};

// ---------------------------------------------------------------------------------------
module.exports = {
  init: init,
  update: update
};


},{"../constants":3}],2:[function(require,module,exports){
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
    redirectURL = String(window.location).replace(/#.*$/, "") + "oauth";
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
    return;
  }
  // window.location = '/'
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


},{"./NonoClient":1}],3:[function(require,module,exports){
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


},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L05vbm9DbGllbnQuY29mZmVlIiwic3JjL2NsaWVudC9jbGllbnQuY29mZmVlIiwic3JjL2NvbnN0YW50cy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNDVTs7QUFBQSxJQUFBLGlCQUFBLEVBQUEsU0FBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVWLFNBQUEsR0FBWSxPQUFBLENBQVEsY0FBUixFQUZGOzs7O0FBT1YsTUFBQSxHQUFTOztBQUNULFlBQUEsR0FBZSxDQUFDOztBQUNoQixZQUFBLEdBQWUsS0FUTDs7OztBQWNWLFNBQUEsR0FBWSxRQUFBLENBQUEsQ0FBQTtTQUNWLFFBQVEsQ0FBQyxjQUFULENBQXdCLE9BQXhCLENBQWdDLENBQUMsS0FBSyxDQUFDLE9BQXZDLEdBQWlEO0FBRHZDOztBQUdaLFdBQUEsR0FBYyxRQUFBLENBQUMsSUFBRCxDQUFBO0VBQ1osSUFBRyxZQUFBLEtBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBN0I7SUFDRSxZQUFBLEdBQWUsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN6QixJQUFHLG9CQUFIO01BQ0UsWUFBQSxDQUFhLFlBQWIsRUFERjs7SUFFQSxZQUFBLEdBQWUsVUFBQSxDQUFXLFNBQVgsRUFBc0IsSUFBdEI7SUFDZixRQUFRLENBQUMsY0FBVCxDQUF3QixPQUF4QixDQUFnQyxDQUFDLFNBQWpDLEdBQTZDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDdkQsUUFBUSxDQUFDLGNBQVQsQ0FBd0IsT0FBeEIsQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsT0FBdkMsR0FBaUQsUUFObkQ7O0FBRFk7O0FBVWQsVUFBQSxHQUFhLFFBQUEsQ0FBQyxJQUFELENBQUE7QUFDYixN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LENBQXdCLE1BQXhCLENBQStCLENBQUMsS0FBSyxDQUFDLE9BQXRDLEdBQWdEO0lBQ2hELFFBQVEsQ0FBQyxjQUFULENBQXdCLFdBQXhCLENBQW9DLENBQUMsS0FBSyxDQUFDLE9BQTNDLEdBQXFEO1dBQ3JELFFBQVEsQ0FBQyxjQUFULENBQXdCLFdBQXhCLENBQW9DLENBQUMsU0FBckMsR0FBaUQsR0FBRyxDQUFDO0VBSGhDLENBQXZCO1NBS0EsVUFBVSxDQUFDLElBQVgsQ0FBZ0IsTUFBaEI7QUF6Q0s7O0FBMkNQLE1BQU0sQ0FBQyxNQUFQLEdBQWdCOzs7O0FDbkloQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsTUFBQSxFQUNFO0lBQUEsT0FBQSxFQUFTO01BQ1AsRUFBQSxFQUFJLENBREc7TUFFUCxJQUFBLEVBQU0sT0FGQztNQUdQLEtBQUEsRUFBTztJQUhBLENBQVQ7SUFLQSxPQUFBLEVBQVM7TUFDUCxFQUFBLEVBQUksQ0FERztNQUVQLElBQUEsRUFBTSxPQUZDO01BR1AsS0FBQSxFQUFPO0lBSEEsQ0FMVDtJQVVBLE9BQUEsRUFBUztNQUNQLEVBQUEsRUFBSSxDQURHO01BRVAsSUFBQSxFQUFNLE9BRkM7TUFHUCxLQUFBLEVBQU87SUFIQSxDQVZUO0lBZUEsT0FBQSxFQUFTO01BQ1AsRUFBQSxFQUFJLENBREc7TUFFUCxJQUFBLEVBQU0sT0FGQztNQUdQLEtBQUEsRUFBTztJQUhBO0VBZlQ7QUFERiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSW5jbHVkZXNcclxuXHJcbmNvbnN0YW50cyA9IHJlcXVpcmUgJy4uL2NvbnN0YW50cydcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgR2xvYmFsc1xyXG5cclxuc29ja2V0ID0gbnVsbFxyXG5lcnJvckNvdW50ZXIgPSAtMVxyXG5lcnJvclRpbWVvdXQgPSBudWxsXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIFJlbmRlclxyXG5cclxuaGlkZUVycm9yID0gLT5cclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3InKS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXHJcblxyXG5yZW5kZXJFcnJvciA9ICh2aWV3KSAtPlxyXG4gIGlmIGVycm9yQ291bnRlciAhPSB2aWV3LmdhbWUuZXJyb3JDb3VudGVyXHJcbiAgICBlcnJvckNvdW50ZXIgPSB2aWV3LmdhbWUuZXJyb3JDb3VudGVyXHJcbiAgICBpZiBlcnJvclRpbWVvdXQ/XHJcbiAgICAgIGNsZWFyVGltZW91dChlcnJvclRpbWVvdXQpXHJcbiAgICBlcnJvclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVFcnJvciwgMzAwMClcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcicpLmlubmVySFRNTCA9IHZpZXcuZ2FtZS5lcnJvclxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Vycm9yJykuc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuICByZXR1cm5cclxuXHJcbnJlbmRlck1lbnUgPSAodmlldykgLT5cclxuICBodG1sID0gXCJcIlwiXHJcbiAgPHByZT5cclxuICBNRU5VXHJcbiAgI3tKU09OLnN0cmluZ2lmeSh2aWV3LCBudWxsLCAyKX1cclxuICA8YSBvbmNsaWNrPVxcXCJhY3Rpb25DaG9vc2VMZXZlbCgnZWFzeTEnKVxcXCI+cGxheSBlYXN5MTwvYT5cclxuICA8YSBvbmNsaWNrPVxcXCJhY3Rpb25DaG9vc2VMZXZlbCgnZWFzeTUnKVxcXCI+cGxheSBlYXN5NTwvYT5cclxuICA8L3ByZT5cclxuICBcIlwiXCJcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbicpLmlubmVySFRNTCA9IGh0bWxcclxuXHJcbnJlbmRlckdhbWUgPSAodmlldykgLT5cclxuICBodG1sID0gXCJcIlwiXHJcbiAgPHByZT5cclxuICBHQU1FXHJcbiAgI3tKU09OLnN0cmluZ2lmeSh2aWV3LCBudWxsLCAyKX1cclxuICA8L3ByZT5cclxuICBcIlwiXCJcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbicpLmlubmVySFRNTCA9IGh0bWxcclxuXHJcbnJlbmRlciA9ICh2aWV3KSAtPlxyXG4gIHJlbmRlckVycm9yKHZpZXcpXHJcbiAgaWYgdmlldy5nYW1lLm1vZGUgPT0gJ21lbnUnXHJcbiAgICByZW5kZXJNZW51KHZpZXcpXHJcbiAgZWxzZVxyXG4gICAgcmVuZGVyR2FtZSh2aWV3KVxyXG5cclxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIyBBY3Rpb25zXHJcblxyXG5hY3Rpb25DaG9vc2VMZXZlbCA9IChsZXZlbE5hbWUpIC0+XHJcbiAgY29uc29sZS5sb2cgXCJhY3Rpb25DaG9vc2VMZXZlbDogI3tsZXZlbE5hbWV9XCJcclxuICBzb2NrZXQuZW1pdCAnYWN0aW9uJywge1xyXG4gICAgYWN0aW9uOiAnY2hvb3NlTGV2ZWwnXHJcbiAgICBuYW1lOiBsZXZlbE5hbWVcclxuICB9XHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIFVwZGF0ZVxyXG5cclxudXBkYXRlID0gKHZpZXcpIC0+XHJcbiAgcmVuZGVyKHZpZXcpXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIEluaXRcclxuXHJcbmluaXQgPSAocykgLT5cclxuICBzb2NrZXQgPSBzXHJcblxyXG4gIHdpbmRvdy5hY3Rpb25DaG9vc2VMZXZlbCA9IGFjdGlvbkNob29zZUxldmVsXHJcblxyXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIGluaXQ6IGluaXRcclxuICB1cGRhdGU6IHVwZGF0ZVxyXG4iLCIjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4jIEluY2x1ZGVzXHJcblxyXG5Ob25vQ2xpZW50ID0gcmVxdWlyZSAnLi9Ob25vQ2xpZW50J1xyXG5cclxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIyBHbG9iYWxzXHJcblxyXG5zb2NrZXQgPSBudWxsXHJcbnNlcnZlckVwb2NoID0gbnVsbFxyXG52aWV3SUQgPSBcIlwiXHJcbmRpc2NvcmRUYWcgPSBcIlwiXHJcbnNwZWN0YXRvck1vZGUgPSBmYWxzZVxyXG5cclxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIyBIZWxwZXJzXHJcblxyXG5ub3cgPSAtPlxyXG4gIHJldHVybiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKVxyXG5cclxucXMgPSAobmFtZSkgLT5cclxuICB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZlxyXG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtcXF1dL2csICdcXFxcJCYnKVxyXG4gIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnWz8mXScgKyBuYW1lICsgJyg9KFteJiNdKil8JnwjfCQpJylcclxuICByZXN1bHRzID0gcmVnZXguZXhlYyh1cmwpO1xyXG4gIGlmIG5vdCByZXN1bHRzIG9yIG5vdCByZXN1bHRzWzJdXHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1syXS5yZXBsYWNlKC9cXCsvZywgJyAnKSlcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgVmlld1xyXG5cclxuc2VuZFZpZXcgPSAtPlxyXG4gIGRpc2NvcmRUb2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0b2tlbicpXHJcbiAgdmlld1BheWxvYWQgPSB7XHJcbiAgICB0b2tlbjogZGlzY29yZFRva2VuXHJcbiAgICB2aWQ6IHZpZXdJRFxyXG4gICAgc3BlY3RhdG9yOiBzcGVjdGF0b3JNb2RlXHJcbiAgfVxyXG4gIGNvbnNvbGUubG9nIFwiU2VuZGluZyB2aWV3OiBcIiwgdmlld1BheWxvYWRcclxuICBzb2NrZXQuZW1pdCAndmlldycsIHZpZXdQYXlsb2FkXHJcblxyXG5yZWNlaXZlVmlldyA9IChwa3QpIC0+XHJcbiAgTm9ub0NsaWVudC51cGRhdGUocGt0KVxyXG5cclxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuIyBPQXV0aFxyXG5cclxubG9nb3V0ID0gLT5cclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlkZW50aXR5XCIpLmlubmVySFRNTCA9IFwiTG9nZ2luZyBvdXQuLi5cIlxyXG4gIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCd0b2tlbicpXHJcbiAgc2VuZElkZW50aXR5KClcclxuXHJcbnNlbmRJZGVudGl0eSA9IC0+XHJcbiAgZGlzY29yZFRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Rva2VuJylcclxuICBpZGVudGl0eVBheWxvYWQgPSB7XHJcbiAgICB0b2tlbjogZGlzY29yZFRva2VuXHJcbiAgfVxyXG4gIGNvbnNvbGUubG9nIFwiU2VuZGluZyBpZGVudGlmeTogXCIsIGlkZW50aXR5UGF5bG9hZFxyXG4gIHNvY2tldC5lbWl0ICdpZGVudGlmeScsIGlkZW50aXR5UGF5bG9hZFxyXG5cclxucmVjZWl2ZUlkZW50aXR5ID0gKHBrdCkgLT5cclxuICBjb25zb2xlLmxvZyBcImlkZW50aWZ5IHJlc3BvbnNlOlwiLCBwa3RcclxuICBpZiBwa3QudGFnPyBhbmQgKHBrdC50YWcubGVuZ3RoID4gMClcclxuICAgIGRpc2NvcmRUYWcgPSBwa3QudGFnXHJcbiAgICBkaXNjb3JkTmlja25hbWVTdHJpbmcgPSBcIlwiXHJcbiAgICBpZiBwa3Qubmlja25hbWU/XHJcbiAgICAgIGRpc2NvcmROaWNrbmFtZSA9IHBrdC5uaWNrbmFtZVxyXG4gICAgICBkaXNjb3JkTmlja25hbWVTdHJpbmcgPSBcIiAoI3tkaXNjb3JkTmlja25hbWV9KVwiXHJcbiAgICBodG1sID0gXCJcIlwiXHJcbiAgICAgICN7ZGlzY29yZFRhZ30je2Rpc2NvcmROaWNrbmFtZVN0cmluZ30gLSBbPGEgb25jbGljaz1cImxvZ291dCgpXCI+TG9nb3V0PC9hPl1cclxuICAgIFwiXCJcIlxyXG4gIGVsc2VcclxuICAgIGRpc2NvcmRUYWcgPSBudWxsXHJcbiAgICBkaXNjb3JkTmlja25hbWUgPSBudWxsXHJcbiAgICBkaXNjb3JkVG9rZW4gPSBudWxsXHJcblxyXG4gICAgcmVkaXJlY3RVUkwgPSBTdHJpbmcod2luZG93LmxvY2F0aW9uKS5yZXBsYWNlKC8jLiokLywgXCJcIikgKyBcIm9hdXRoXCJcclxuICAgIGxvZ2luTGluayA9IFwiaHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvb2F1dGgyL2F1dGhvcml6ZT9jbGllbnRfaWQ9I3t3aW5kb3cuQ0xJRU5UX0lEfSZyZWRpcmVjdF91cmk9I3tlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVUkwpfSZyZXNwb25zZV90eXBlPWNvZGUmc2NvcGU9aWRlbnRpZnlcIlxyXG4gICAgaHRtbCA9IFwiXCJcIlxyXG4gICAgICBbPGEgaHJlZj1cIiN7bG9naW5MaW5rfVwiPkxvZ2luPC9hPl1cclxuICAgIFwiXCJcIlxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaWRlbnRpdHlcIikuaW5uZXJIVE1MID0gaHRtbFxyXG4gIHNlbmRWaWV3KClcclxuXHJcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiMgSW5pdCAvIE1haW5cclxuXHJcbmluaXQgPSAtPlxyXG4gIGNvbnNvbGUubG9nIFwiaW5pdFwiXHJcbiAgd2luZG93LmxvZ291dCA9IGxvZ291dFxyXG5cclxuICB0b2tlbiA9IHFzKCd0b2tlbicpXHJcbiAgaWYgdG9rZW4/XHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndG9rZW4nLCB0b2tlbilcclxuICAgICMgd2luZG93LmxvY2F0aW9uID0gJy8nXHJcbiAgICByZXR1cm5cclxuXHJcbiAgdmlld0lEID0gcXMoJ3ZpZCcpXHJcbiAgY29uc29sZS5sb2cgXCJ2aWV3SUQgI3t2aWV3SUR9XCJcclxuICBzcGVjdGF0b3JNb2RlID0gcXMoJ3NwZWN0YXRvcicpP1xyXG4gIGNvbnNvbGUubG9nIFwic3BlY3RhdG9yTW9kZSAje3NwZWN0YXRvck1vZGV9XCJcclxuXHJcbiAgaWYgc3BlY3RhdG9yTW9kZVxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2lkZW50aXR5Jykuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xyXG5cclxuICBzb2NrZXQgPSBpbygpXHJcbiAgc29ja2V0Lm9uICdjb25uZWN0JywgLT5cclxuICAgIGNvbnNvbGUubG9nIFwic29ja2V0IElEOiAje3NvY2tldC5pZH1cIlxyXG4gIHNvY2tldC5vbiAnc2VydmVyJywgKHNlcnZlcikgLT5cclxuICAgIGNvbnNvbGUubG9nICdzZXJ2ZXIgbWVzc2FnZScsIHNlcnZlclxyXG4gICAgaWYgc2VydmVyRXBvY2g/XHJcbiAgICAgIGlmIHNlcnZlckVwb2NoICE9IHNlcnZlci5lcG9jaFxyXG4gICAgICAgIGNvbnNvbGUubG9nIFwiU2VydmVyIGVwb2NoIGNoYW5nZWQhIFRoZSBzZXJ2ZXIgbXVzdCBoYXZlIHJlYm9vdGVkLiBSZWxvYWRpbmcuLi5cIlxyXG4gICAgICAgIHNvY2tldC5kaXNjb25uZWN0KClcclxuICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgZWxzZVxyXG4gICAgICBzZXJ2ZXJFcG9jaCA9IHNlcnZlci5lcG9jaFxyXG4gICAgc2VuZElkZW50aXR5KClcclxuICBzb2NrZXQub24gJ2lkZW50aWZ5JywgKHBrdCkgLT5cclxuICAgIHJlY2VpdmVJZGVudGl0eShwa3QpXHJcbiAgc29ja2V0Lm9uICd2aWV3JywgKHBrdCkgLT5cclxuICAgIHJlY2VpdmVWaWV3KHBrdClcclxuICBzb2NrZXQub24gJ2Vycm9ydGV4dCcsIChwa3QpIC0+XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIikuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlcnJvcnRleHRcIikuc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXJyb3J0ZXh0XCIpLmlubmVySFRNTCA9IHBrdC50ZXh0XHJcblxyXG4gIE5vbm9DbGllbnQuaW5pdChzb2NrZXQpXHJcblxyXG53aW5kb3cub25sb2FkID0gaW5pdFxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgbGV2ZWxzOlxyXG4gICAgXCJlYXN5MVwiOiB7XHJcbiAgICAgIGlkOiAxXHJcbiAgICAgIG5hbWU6IFwiZWFzeTFcIlxyXG4gICAgICB0aXRsZTogXCJFYXN5IFBlYXN5XCJcclxuICAgIH1cclxuICAgIFwiZWFzeTJcIjoge1xyXG4gICAgICBpZDogMlxyXG4gICAgICBuYW1lOiBcImVhc3kyXCJcclxuICAgICAgdGl0bGU6IFwiRWFzeSBQZWFzeVwiXHJcbiAgICB9XHJcbiAgICBcImVhc3kzXCI6IHtcclxuICAgICAgaWQ6IDNcclxuICAgICAgbmFtZTogXCJlYXN5MVwiXHJcbiAgICAgIHRpdGxlOiBcIkVhc3kgUGVhc3lcIlxyXG4gICAgfVxyXG4gICAgXCJlYXN5NFwiOiB7XHJcbiAgICAgIGlkOiA0XHJcbiAgICAgIG5hbWU6IFwiZWFzeTFcIlxyXG4gICAgICB0aXRsZTogXCJFYXN5IFBlYXN5XCJcclxuICAgIH1cclxuIl19
