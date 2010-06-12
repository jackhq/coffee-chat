class Hello
  constructor: ->
    @name: "world"
  m: ->
    puts "Hello"
    puts @name


h: new Hello()

h.m()