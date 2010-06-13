HOST: null
PORT: process.env.PORT || 8001

starttime: new Date().getTime()

mem: process.memoryUsage()

mem_usage: ->
  mem: process.memoryUsage()
  
setInterval mem_usage, 10*1000

fu: require "./fu"
sys: require "sys"
url: require "url"
qs: require "querystring"

MESSAGE_BACKLOG: 200
SESSION_TIMEOUT: 60 * 1000

class Channel    
  messages: []
  callbacks: []
  appendMessage: (nick, type, text) ->
    m: { nick: nick, type: type, text: text, timestamp: new Date().getTime() }
    switch type
      when "msg"
       sys.puts "<" + nick + ">"
      when "join"
       sys.puts nick + " join"
      when "part"
       sys.puts nick + " part"
    @messages.push m
    @callbacks.shift().callback([m]) while @callbacks.length > 0
    @messages.shift() while @messages.length > MESSAGE_BACKLOG  
    
  query: (since, callback) ->
    matching: []
    for message in @messages
      matching.push message if message.timestamp > since
    if matching.length isnt 0 
      callback matching 
    else 
      @callbacks.push { timestamp: new Date(), callback: callback }  
    
    setInterval( =>
      now: new Date()
      @callbacks.shift().callback([]) while @callbacks.length > 0 and now - @callbacks[0].timestamp > 30*1000 
    3000
    )


sessions: {}
channel: new Channel()

createSession: (nick) ->
  if nick.length > 50 then return null
  if /[^\w_\-^!]/.exec(nick) then return null
  for session in sessions
    if session.nick == nick then return null
  
  session: {
    nick: nick,
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),
    poke: ->
      session.timestamp: new Date()
    
    destroy: -> 
      channel.appendMessage session.nick, "part"
      delete sessions[session.id]
       
  }
  sessions[session.id]: session
  session
  

kill_sessions: ->
  now: new Date()
  for session in sessions
    if !sessions.hasOwnProperty(id) then continue
    session: session[id]
    if now - session.timestamp > SESSION_TIMEOUT then session.destroy()
  
setInterval kill_sessions, 1000

fu.listen(PORT, HOST)

fu.get("/", fu.staticHandler("index.html"))
fu.get("/style.css", fu.staticHandler("style.css"))
fu.get("/client.js", fu.staticHandler("client.js"))
fu.get("/jquery-1.4.2.min.js", fu.staticHandler("jquery-1.4.2.min.js"))

fu.get('/who', (req, res) ->
  nicks: []
  for session in sessions
    if !sessions.hasOwnProperty(id) then continue
    nicks.push(session.nick)
  res.simpleJSON(200, { nicks: nicks, rss: mem.rss })
)

fu.get('/join', (req, res) ->
  nick: qs.parse(url.parse(req.url).query).nick
  if nick.length == 0 
    res.simpleJSON(400, { error: "Bad nick." })
    return
  session: createSession(nick)
  if session == null
    res.simpleJSON(400, { error: "Nick in use." })
    return
  
  channel.appendMessage(session.nick, "join")
  res.simpleJSON(200, { id: session.id, nick: session.nick, rss: mem.rss, starttime: starttime })
)

fu.get("/send", (req, res) ->
  id: qs.parse(url.parse(req.url).query).id
  text: qs.parse(url.parse(req.url).query).text
  
  session: sessions[id]
  if !session or !text
    res.simpleJSON(400, { error: "No such session id"})
    return
  session.poke()
  channel.appendMessage session.nick, "msg", text
  res.simpleJSON(200, { rss: mem.rss })
)


fu.get("/part", (req, res) -> 
  id: qs.parse(url.parse(req.url).query).id
  if id and sessions[id]
    session: sessions[id]
    session.destroy()
  res.simpleJSON(200, { rss: mem.rss })
)

fu.get("/recv", (req, res) ->
  id: qs.parse(url.parse(req.url).query).id
  if id and sessions[id]
    session: sessions[id]
    session.poke()
    
  since: parseInt(qs.parse(url.parse(req.url).query).since, 10)
  
  channel.query(since, (messages) ->
    if session then session.poke()
    res.simpleJSON(200, { messages: messages, rss: mem.rss })
    
  )
)


