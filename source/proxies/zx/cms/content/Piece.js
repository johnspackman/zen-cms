/**
 * This proxy class is generated by `zx.io.remote.proxy.ClassWriter` and should not be edited manually
 * because it will be overwritten.
 *
 * To regenerate, use `zx create-proxies`, and the CMS server will automatically do the same during startup.
 *
 * Copyright and License - this file is copyright and licensed under the terms provided by the copyright owner, 
 * which presumably match the owner and license terms of the original source file.  It is your responsibility 
 * to determine ownership and terms.
 *

  


  
 * @require(zx.io.persistence.anno.Property)
  
 * @require(zx.io.remote.anno.Property)
  

 */
qx.Class.define("zx.cms.content.Piece", {
  extend: zx.io.persistence.Object,
  
    include: [ zx.cms.content.MPiece ],
  

  construct(...vargs) {
    this.base(arguments, ...vargs);
    zx.io.remote.NetworkEndpoint.initialiseRemoteClass(zx.cms.content.Piece);
  },

  properties: {
    
      pieceTitle: {
         init: null, 
        
           check: "String", 
          nullable: true,
           event: "changePieceTitle", 
           apply: "_applyPieceTitle", 
          
        
        "@": [new zx.io.persistence.anno.Property(), new zx.io.remote.anno.Property()]
      },
    
  },

  members: {
    
      _applyPieceTitle(value, oldValue) {
        // Nothing - to be overridden
      },
    

    
  }
});
