(function(){
  var Channel, HOST, MESSAGE_BACKLOG, PORT, SESSION_TIMEOUT, channel, createSession, fu, kill_sessions, mem, mem_usage, qs, sessions, starttime, sys, url;
  HOST = null;
  PORT = 8001;
  starttime = new Date().getTime();
  mem = process.memoryUsage();
  mem_usage = function mem_usage() {
    mem = process.memoryUsage();
    return mem;
  };
  setInterval(mem_usage, 10 * 1000);
  fu = require("./fu");
  sys = require("sys");
  url = require("url");
  qs = require("querystring");
  MESSAGE_BACKLOG = 200;
  SESSION_TIMEOUT = 60 * 1000;
  Channel = function Channel() {
    Channel.prototype.messages = [];
    Channel.prototype.callbacks = [];
    
    var on_setInterval;
    on_setInterval = function on_setInterval() {
      var _a, now;
      now = new Date();
      _a = [];
      while (this.callbacks.length > 0 && now - this.callbacks[0].timestamp > 30 * 1000) {
        _a.push(this.callbacks.shift().callback([]));
      }
      return _a;
    };
    setInterval(on_setInterval, 3000);
    return this;
  };
  Channel.prototype.appendMesssage = function appendMesssage(nick, type, text) {
    var _a, m;
    m = {
      nick: nick,
      type: type,
      text: text,
      timestamp: new Date().getTime()
    };
    if (type === "msg") {
      sys.puts("<" + nick + ">");
    } else if (type === "join") {
      sys.puts(nick + " join");
    } else if (type === "part") {
      sys.puts(nick + " part");
    }
    this.messages.push(m);
    while (this.callbacks.length > 0) {
      this.callbacks.shift().callback([m]);
    }
    _a = [];
    while (this.messages.length > MESSAGE_BACKLOG) {
      _a.push(this.messages.shift());
    }
    return _a;
  };
  Channel.prototype.query = function query(since, callback) {
    var _a, _b, _c, matching, message;
    matching = [];
    _b = this.messages;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      message = _b[_a];
      if (message.timestamp > since) {
        matching.push(message);
      }
    }
    if (matching.length !== 0) {
      return callback(matching);
    } else {
      return this.callbacks.push({
        timestamp: new Date(),
        callback: callback
      });
    }
  };
  sessions = {};
  channel = new Channel();
  createSession = function createSession(nick) {
    var _a, _b, _c, session;
    if (nick.length > 50) {
      return null;
    }
    if (/[^\w_\-^!]/.exec(nick)) {
      return null;
    }
    _b = sessions;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      session = _b[_a];
      if (session.nick === nick) {
        return null;
      }
    }
    session = {
      nick: nick,
      id: Math.floor(Math.random() * 99999999999).toString(),
      timestamp: new Date(),
      poke: function poke() {
        session.timestamp = new Date();
        return session.timestamp;
      },
      destroy: function destroy() {
        channel.appendMessage(session.nick, "part");
        return delete sessions[session.id];
      }
    };
    sessions[session.id] = session;
    return session;
  };
  kill_sessions = function kill_sessions() {
    var _a, _b, _c, now, session;
    now = new Date();
    _b = sessions;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      session = _b[_a];
      if (!sessions.hasOwnProperty(id)) {
        continue;
      }
      session = session[id];
      now - session.timestamp > SESSION_TIMEOUT ? session.destroy() : null;
    }
  };
  setInterval(kill_sessions, 1000);
  fu.listen(PORT, HOST);
  fu.get("/", fu.staticHandler("index.html"));
  fu.get("/style.css", fu.staticHandler("style.css"));
  fu.get("/client.js", fu.staticHandler("client.js"));
  fu.get("/jquery-1.4.2.min.js", fu.staticHandler("jquery-1.4.2.min.js"));
  //
  fu.get('/who', function(req, res) {
    var _a, _b, _c, nicks, session;
    nicks = [];
    _b = sessions;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      session = _b[_a];
      if (!sessions.hasOwnProperty(id)) {
        continue;
      }
      nicks.push(session.nick);
    }
    return res.simpleJSON(200, {
      nicks: nicks,
      rss: mem.rss
    });
  });
  fu.get('/join', function(req, res) {
    var nick, session;
    nick = qs.parse(url.parse(req.url).query).nick;
    if (nick.length === 0) {
      res.simpleJSON(400, {
        error: "Bad nick."
      });
      return null;
    }
    session = createSession(nick);
    if (session === null) {
      res.simpleJSON(400, {
        error: "Nick in use."
      });
      return null;
    }
    channel.appendMessage(session.nick, "join");
    return res.simpleJSON(200, {
      id: session.id,
      nick: session.nick,
      rss: mem.rss,
      starttime: starttime
    });
  });
  fu.get("/part", function(req, res) {
    var id, session;
    id = qs.parse(url.parse(req.url).query).id;
    if (id && sessions[id]) {
      session = sessions[id];
      session.destroy();
    }
    return res.simpleJSON(200, {
      rss: mem.rss
    });
  }, fu.get("/recv", function(req, res) {
    var id, session, since;
    if (!qs.parse(url.parse(req.url).query).since) {
      res.simpleJSON(400, {
        error: "Must supply since parameter"
      });
      return null;
    }
    id = qs.parse(url.parse(req.url).query).id;
    if (id && sessions[id]) {
      session = sessions[id];
      session.poke();
    }
    since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
    return channel.query(since, function(message) {
      session ? session.poke() : null;
      return res.simpleJSON(200, {
        messages: messages,
        rss: mem.rss
      });
    });
  }));
  fu.get("/send", function(req, res) {
    var id, session, text;
    id = qs.parse(url.parse(req.url).query).id;
    text = qs.parse(url.parse(req.url).query).text;
    session = sessions[id];
    if (!session || !text) {
      res.simpleJSON(400, {
        error: "No such session id"
      });
      return null;
    }
    session.poke();
    channel.appendMessage(session.nick, "msg", text);
    return res.simpleJSON(200, {
      rss: mem.rss
    });
  });
})();
