var ObjectId = require("mongodb").ObjectID;

function microblog_init(db){
  //var usuarioColl = db.collection('Usuarios');
  var publicacionColl = db.collection('Publicaciones');
  var modeloBlogger = {};
  // funcion para agregar usuarios
/*  modeloBlogger.agregarUsuario = function(data, handler){
        usuarioColl.insert(data, function(err, doc){
          if(err){
            handler(err,null);
          }else{
            handler(null, doc);
          }
        });
    };*/

    // funcion para agregar publicaciones
    modeloBlogger.agregarPublicacion = function(data, handler){
          publicacionColl.insert(data, function(err, d){
            if(err){
              handler(err,null);
            }else{
              handler(null, d);
            }
          });
      };

  modeloBlogger.obtenerPublicaciones = function(handler){
    publicacionColl.find({}).toArray(function(err, Publicaciones){
      //console.log(Publicaciones);
      if(err){
        handler(err, null);
      }else{
        handler(null,Publicaciones);
      }
    });

  }
  return modeloBlogger;

}

module.exports = microblog_init;
