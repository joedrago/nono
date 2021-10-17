# ---------------------------------------------------------------------------------------
# Includes

express = require 'express'
fs = require 'fs'
https = require 'https'
Games = require './Games'

# ---------------------------------------------------------------------------------------
# Helpers

now = ->
  return Math.floor(Date.now() / 1000)

pad = (s, count) ->
  return ("                   " + s).slice(-1 * count)

randomString = ->
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

# ---------------------------------------------------------------------------------------
# Globals

serverEpoch = now()
secrets = null
connections = {}
ownerLookup = {} # [tag -> vid] map, ensuring a user only has one active owned view
views = {}
discordAuth = {}
games = null

# ---------------------------------------------------------------------------------------
# Load / Save

load = ->
  if fs.existsSync("views.json")
    views = JSON.parse(fs.readFileSync("views.json", 'utf8'))
    for vid, view of views
      ownerLookup[view.owner] = vid
  if fs.existsSync("auth.json")
    discordAuth = JSON.parse(fs.readFileSync("auth.json", 'utf8'))

  games = new Games
  return

saveViewsNeeded = false
saveDiscordAuthNeeded = false

saveViews = ->
  saveViewsNeeded = true

saveDiscordAuth = ->
  saveDiscordAuthNeeded = true

saveIfNeeded = ->
  if saveViewsNeeded
    # TODO: REENABLE
    # fs.writeFileSync("views.json", JSON.stringify(views, null, 2))
    # console.log "Views saved."
    saveViewsNeeded = false
  if saveDiscordAuthNeeded
    fs.writeFileSync("auth.json", JSON.stringify(discordAuth, null, 2))
    saveDiscordAuthNeeded = false
    # console.log "Discord auth saved."
  games.saveIfNeeded()

# saveUserPlaylists = ->
#   fs.writeFileSync("userplaylists.json", JSON.stringify(userPlaylists, null, 2))

# logOutput = (pkt) ->
#   output.push pkt
#   while output.length > 10
#     output.shift()
#   return

# refreshDashboards = ->
#   for vid, soc of sockets
#     soc.emit 'refresh', {}

# requestDashboardRefresh = ->
#   dashboardsRefreshNeeded = true

# refreshDashboardsIfNeeded = ->
#   if dashboardsRefreshNeeded
#     # console.log "refreshDashboardsIfNeeded(): refreshing..."
#     dashboardsRefreshNeeded = false
#     refreshDashboards()

# soloBroadcast = (sender, pkt) ->
#   for vid, soc of sockets
#     if vid == sender
#       continue

#     if soloViews[vid] == pkt.id
#       soc.emit 'solo', pkt
#   return

# ---------------------------------------------------------------------------------------
# View

viewAddPlayer = (view, sid, auth) ->
  console.log "viewAddPlayer: sid #{sid} vid #{view.vid} auth #{auth}"
  if view.players[sid]?
    return
  usedPids = {}
  for ignoredSid, player of view.players
    usedPids[player.pid] = true
  pid = 1
  while usedPids[pid]
    pid += 1
  tag = null
  if auth? and auth.tag?
    tag = auth.tag
  view.players[sid] =
    pid: pid
    tag: tag
  connections[sid].vid = view.vid
  console.log "viewAddPlayer complete: view", view

viewAddSpectator = (view, sid) ->
  view.spectators[sid] = true
  connections[sid].vid = view.vid
  console.log "viewAddSpectator complete: view", view

viewRemoveSocket = (view, sid) ->
  console.log "viewRemoveSocket: sid #{sid} vid #{view.vid}"
  if view.players[sid]?
    delete view.players[sid]
  if view.spectators[sid]?
    delete view.spectators[sid]
  saveViews()

viewDisconnect = (sid) ->
  console.log "viewDisconnect: #{sid}"
  connection = connections[sid]
  if connection?
    if connection.vid? and views[connection.vid]?
      view = views[connection.vid]
      viewRemoveSocket(view, sid)
      viewBroadcast(view)

viewNew = (vid, sid, auth) ->
  if not auth?
    console.error "calling viewNew without auth! Impossible!"
    process.exit(1)

  view = {
    vid: vid
    owner: auth.tag
    players: {}
    spectators: {}
    game: null
  }
  console.log "viewNew: ", view
  prevVid = ownerLookup[auth.tag]?
  if prevVid? and views[prevVid]?
    # Cleanup this player's previously owned view
    delete views[prevVid]
  views[vid] = view
  ownerLookup[auth.tag] = view
  saveViews()
  return view

viewBroadcast = (view) ->
  console.log "viewBroadcast", view
  games.updateView(view)
  for sid, player of view.players
    console.log "player #{player.pid}: #{sid}"
    connection = connections[sid]
    if connection?
      connection.socket.emit 'view', view
  for sid, spectator of view.spectators
    console.log "spectator: #{sid}"
    connection = connections[sid]
    if connection?
      connection.socket.emit 'view', view

receiveView = (socket, pkt) ->
  if not pkt.vid?
    return
  auth = null
  if pkt.token? and discordAuth[pkt.token]?
    auth = discordAuth[pkt.token]

  view = views[pkt.vid]
  if view?
    # Already have this view
    console.log "Found view:", view
  else if auth? and not pkt.spectator
    # Create a new view for this user
    view = viewNew(pkt.vid, socket.id, auth)
  else
    # An unknown view and the user isn't logged in to own it. Error out.
    socket.emit 'errortext', {
      text: "No such view. Please login to create your own view."
    }
    return

  if not pkt.spectator
    viewAddPlayer(view, socket.id, auth)
  else
    viewAddSpectator(view, socket.id)
  viewBroadcast(view)

processAction = (socket, pkt) ->
  console.log "processAction:", pkt
  connection = connections[socket.id]
  if not connection?
    console.log "no connection"
    return
  view = views[connection.vid]
  if not view?
    console.log "no view"
    return

  player = view.players[socket.id]
  if player?
    games.action(view, player.pid, pkt)
    viewBroadcast(view)
  else
    console.log "no player"
    return

# ---------------------------------------------------------------------------------------
# OAuth

processOAuth = (code) ->
  console.log "processOAuth: #{code}"
  return new Promise (resolve, reject) ->
    if not code? or (code.length < 1)
      resolve('')
      return

    postdata =
      client_id: secrets.discordClientID
      client_secret: secrets.discordClientSecret
      grant_type: 'authorization_code'
      redirect_uri: secrets.url + '/oauth'
      code: code
      scope: 'identify'
    params = String(new URLSearchParams(postdata))

    options =
      hostname: 'discord.com'
      port: 443
      path: '/api/oauth2/token'
      method: 'POST'
      headers:
        'Content-Length': params.length
        'Content-Type': 'application/x-www-form-urlencoded'
    req = https.request options, (res) ->
      rawJSON = ""
      res.on 'data', (chunk) ->
        rawJSON += chunk
      res.on 'error', ->
        console.log "Error getting auth"
        resolve('')
      res.on 'end', ->
        data = null
        try
          data = JSON.parse(rawJSON)
        catch
          console.log "ERROR: Failed to talk to parse JSON: #{rawJSON}"
          resolve('')
          return

        # console.log "Discord replied: ", JSON.stringify(data, null, 2)
        if not data.access_token? or (data.access_token.length < 1) or not data.token_type? or (data.token_type.length < 1)
          console.log "bad oauth reply (no access_token or token_type):", data
          resolve('')
          return

        meOptions =
          hostname: 'discord.com'
          port: 443
          path: '/api/users/@me'
          headers:
            'Authorization': "#{data.token_type} #{data.access_token}"
        # console.log "meOptions:", meOptions
        meReq = https.request meOptions, (meRes) ->
          meRawJSON = ""
          meRes.on 'data', (chunk) ->
            meRawJSON += chunk
          meRes.on 'error', ->
            console.log "Error getting auth"
            resolve('')
          meRes.on 'end', ->
            meData = null
            try
              meData = JSON.parse(meRawJSON)
            catch
              console.log "ERROR: Failed to talk to parse JSON: #{meRawJSON}"
              resolve('')
              return

            # console.log "Me replied:", meData
            if meData? and meData.username? and meData.discriminator?
              tag = "#{meData.username}##{meData.discriminator}"
              loop
                newToken = randomString()
                if not discordAuth[newToken]?
                  break
              discordAuth[newToken] =
                token: newToken
                tag: tag
                added: now()
              console.log "Login [#{newToken}]: #{discordAuth[newToken].tag}"
              resolve(newToken)
              saveDiscordAuth()
            else
              console.log "ERROR: Giving up on new token, couldn't get username and discriminator:", meData
              resolve('')

        meReq.end()

    req.write(params)
    req.end()
    console.log "sending request:", postdata

# ---------------------------------------------------------------------------------------
# Main

main = (argv) ->
  secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'))
  console.log "Secrets:"
  console.log JSON.stringify(secrets, null, 2)

  load()

  if not secrets.discordClientID or not secrets.discordClientSecret
    console.log "Discord settings required."
    process.exit(1)

  setInterval( ->
    saveIfNeeded()
  , 5 * 1000)

  app = express()
  http = require('http').createServer(app)

  io = require('socket.io')(http, { pingTimeout: 10000 })
  io.on 'connection', (socket) ->
    console.log "-----------\nCONNECT[#{socket.id}]"
    connections[socket.id] =
      socket: socket
      vid: null

    socket.emit('server', { epoch: serverEpoch })

    socket.on 'disconnect', ->
      console.log "DISCONNECT[#{socket.id}]"
      viewDisconnect(socket.id)
      if connections[socket.id]?
        delete connections[socket.id]

    socket.on 'identify', (pkt) ->
      if pkt.token? and discordAuth[pkt.token]?
        reply =
          tag: discordAuth[pkt.token].tag
        socket.emit 'identify', reply
        return
      socket.emit 'identify', {}

    socket.on 'view', (pkt) ->
      receiveView(socket, pkt)
    socket.on 'action', (pkt) ->
      processAction(socket, pkt)

  app.get '/', (req, res) ->
    vid = req.query.vid
    if not vid?
      loop
        vid = randomString()
        if not views[vid]?
          break
      url = "/?vid=#{vid}"
      for k,v of req.query
        url += "&#{encodeURIComponent(k)}=#{encodeURIComponent(v)}"
      res.redirect(url)
      return
    html = fs.readFileSync("#{__dirname}/../web/client.html", "utf8")
    discordClientID = secrets.discordClientID
    if not discordClientID?
      discordClientID = "0"
    html = html.replace(/!CLIENT_ID!/, discordClientID)
    res.send(html)

  app.get '/oauth', (req, res) ->
    if req.query? and req.query.code?
      processOAuth(req.query.code).then (token) ->
        if token? and (token.length > 0)
          res.redirect("/?token=#{token}")
        else
          res.redirect('/')
    else
      res.redirect('/')

  app.use(express.static('web'))

  host = '127.0.0.1'
  if argv.length > 0
    host = '0.0.0.0'

  http.listen 3003, host, ->
    console.log("listening on #{host}:3003")

module.exports = main
