var Hello, h;
Hello = function() {
  this.name = "world";
  return this;
};
Hello.prototype.m = function() {
  puts("Hello");
  return puts(this.name);
};

h = new Hello();
h.m();