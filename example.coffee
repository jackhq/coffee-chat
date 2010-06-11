x: {
  TYPES: { 
    ".3gp": "video/3gpp", 
    ".a": "application/octet-stream", 
    ".ai": "application/postscript", 
    ".aif": "audio/x-aiff", 
    ".aiff" : "audio/x-aiff", 
    ".asc" : "application/pgp-signature", 
    ".asf" : "video/x-ms-asf",
    ".asm" : "text/x-asm",
    ".asx" : "video/x-ms-asf",
    ".atom" : "application/atom+xml" },
  l: ->
    @TYPES[".asm"]

  
}
    
puts x.l()

