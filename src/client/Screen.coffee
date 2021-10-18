class Screen
  constructor: (@htmlID, @resizeCB, @clickCB) ->
    @canvas = document.getElementById('main')
    @context = @canvas.getContext('2d')
    @resizeToScreen()

    window.addEventListener('resize', @onResize.bind(this), false)
    @canvas.addEventListener('click', @onClick.bind(this), false)
    @canvas.addEventListener('contextmenu', @onRightClick.bind(this), false)

  resizeToScreen: ->
    @width = window.innerWidth
    @height = window.innerHeight
    @canvas.width = @width
    @canvas.height = @height

  onResize: ->
    @resizeToScreen()
    console.log "onResize: #{@width}x#{@height}"
    if @resizeCB?
      @resizeCB()

  onClick: (ev) ->
    ev.preventDefault()
    x = ev.clientX
    y = ev.clientY
    which = 0
    if @clickCB?
      @clickCB(x, y, which)
    return false

  onRightClick: (ev) ->
    ev.preventDefault()
    x = ev.clientX
    y = ev.clientY
    which = 1
    if @clickCB?
      @clickCB(x, y, which)
    return false

  fillRect: (x, y, w, h, style) ->
    @context.beginPath()
    @context.rect(x, y, w, h)
    @context.lineWidth = 0
    @context.fillStyle = style
    @context.fill()

  drawRect: (x, y, w, h, lineWidth, style) ->
    @context.beginPath()
    @context.rect(x, y, w, h)
    @context.lineWidth = lineWidth
    @context.strokeStyle = style
    @context.stroke()

  drawText: (x, y, text, size, style) ->
    @context.font = "#{size}px monospace"
    @context.lineWidth = 0
    @context.fillStyle = style
    @context.textBaseline = "top"
    @context.textAlign = "left"
    @context.fillText(text, x, y);

  drawTextCentered: (x, y, text, size, style) ->
    @context.font = "#{size}px monospace"
    @context.lineWidth = 0
    @context.fillStyle = style
    @context.textBaseline = "top"
    @context.textAlign = "center"
    @context.fillText(text, x, y);

module.exports = Screen
