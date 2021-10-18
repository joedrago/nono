# ---------------------------------------------------------------------------------------
# Includes

NonoClient = require './NonoClient'

# ---------------------------------------------------------------------------------------
# Globals

socket = null
serverEpoch = null
viewID = ""
discordTag = ""
spectatorMode = false

# ---------------------------------------------------------------------------------------
# Helpers

now = ->
  return Math.floor(Date.now() / 1000)

qs = (name) ->
  url = window.location.href
  name = name.replace(/[\[\]]/g, '\\$&')
  regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  results = regex.exec(url);
  if not results or not results[2]
    return null
  return decodeURIComponent(results[2].replace(/\+/g, ' '))

# ---------------------------------------------------------------------------------------
# View

sendView = ->
  discordToken = localStorage.getItem('token')
  viewPayload = {
    token: discordToken
    vid: viewID
    spectator: spectatorMode
  }
  console.log "Sending view: ", viewPayload
  socket.emit 'view', viewPayload

receiveView = (pkt) ->
  console.log "receiveView: ", pkt
  NonoClient.update(pkt)

# ---------------------------------------------------------------------------------------
# OAuth

logout = ->
  document.getElementById("identity").innerHTML = "Logging out..."
  localStorage.removeItem('token')
  sendIdentity()

sendIdentity = ->
  discordToken = localStorage.getItem('token')
  identityPayload = {
    token: discordToken
  }
  console.log "Sending identify: ", identityPayload
  socket.emit 'identify', identityPayload

receiveIdentity = (pkt) ->
  console.log "identify response:", pkt
  if pkt.tag? and (pkt.tag.length > 0)
    discordTag = pkt.tag
    discordNicknameString = ""
    if pkt.nickname?
      discordNickname = pkt.nickname
      discordNicknameString = " (#{discordNickname})"
    html = """
      #{discordTag}#{discordNicknameString} - [<a onclick="logout()">Logout</a>]
    """
  else
    discordTag = null
    discordNickname = null
    discordToken = null

    redirectURL = String(window.location).replace(/\/[^\/]*$/, "/") + "oauth" #+ "?vid=#{encodeURIComponent(viewID)}"
    console.log "redirectURL #{redirectURL}"
    loginLink = "https://discord.com/api/oauth2/authorize?client_id=#{window.CLIENT_ID}&redirect_uri=#{encodeURIComponent(redirectURL)}&response_type=code&scope=identify"
    html = """
      [<a href="#{loginLink}">Login</a>]
    """
  document.getElementById("identity").innerHTML = html
  sendView()

# ---------------------------------------------------------------------------------------
# Init / Main

init = ->
  console.log "init"
  window.logout = logout

  token = qs('token')
  if token?
    localStorage.setItem('token', token)
    window.location = '/'
    return

  viewID = qs('vid')
  console.log "viewID #{viewID}"
  spectatorMode = qs('spectator')?
  console.log "spectatorMode #{spectatorMode}"

  if spectatorMode
    document.getElementById('identity').style.display = 'none'

  socket = io()
  socket.on 'connect', ->
    console.log "socket ID: #{socket.id}"
  socket.on 'server', (server) ->
    console.log 'server message', server
    if serverEpoch?
      if serverEpoch != server.epoch
        console.log "Server epoch changed! The server must have rebooted. Reloading..."
        socket.disconnect()
        location.reload()
        return
    else
      serverEpoch = server.epoch
    sendIdentity()
  socket.on 'identify', (pkt) ->
    receiveIdentity(pkt)
  socket.on 'view', (pkt) ->
    receiveView(pkt)
  socket.on 'errortext', (pkt) ->
    document.getElementById("main").style.display = 'none'
    document.getElementById("errortext").style.display = 'block'
    document.getElementById("errortext").innerHTML = pkt.text

  NonoClient.init(socket)

window.onload = init
