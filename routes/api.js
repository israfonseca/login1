var express = require('express');
var path = require('path');
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;
var md5 = require('md5');
var multer = require('multer');
var regexpt = /^((image)|(video))\/\w*$/i;
var fs = require('fs');
var upload = multer({dest:"public/img/",
                     limits:{
                         fileSize: (1024 * 1024 * 10)
                     },
                     fileFilter: function(req, file, cb){
                         if(regexpt.test(file.mimetype)){
                             cb(null, true);
                         }else{
                             cb(null, false);
                         }
                     }
                 });

function getAPIRoutes(db){
    //Loading MongoDB Collections
  //  var blogMdl = BlogFabric(db);
  //console.log(blogMdl);

    var product_backlog = db.collection('product_backlog');
    var users = db.collection('users');
    var publicaciones = db.collection('publicaciones');



    // Security Entries
    router.post('/register', function(req,res){
        if(req.body.reg_pwd == req.body.reg_pwd_cnf){
            var newUser={
                user : req.body.reg_user,
                name : req.body.reg_name,
                created: Date.now(),
                password:"",
                failedTries : 0,
                lastlogin: 0,
                lastChangePassword:0,
                oldPasswords:[]
            };
            var saltedPassword = "";
            if(newUser.created % 2 === 0){
                saltedPassword = newUser.user.substring(0,3) + req.body.reg_pwd;
            }else{
                saltedPassword = req.body.reg_pwd + newUser.user.substring(0,3);
            }
            newUser.password = md5(saltedPassword);
            users.insertOne(newUser, function(err, result){
                if(err){
                    res.status(403).json({"error":err});
                }else{
                    res.status(200).json({"ok":true});
                }
            });
        }else{
            res.status(403).json({"error":"No validado"});
        }
    });
    router.post('/login', function(req,res){
        var useremail = req.body.lgn_user,
            password = req.body.lgn_pwd;

        users.findOne({user:useremail},{fields:{_id:1,user:1,password:1,created:1}}, function(err, doc){
            if(err){
                res.status(401).json({"error":"Log In Failed"});
            }else{
                if(doc){
                    var saltedPassword="";
                    if(doc.created%2 ===0){
                        saltedPassword = doc.user.substring(0,3) + password;
                    }else{
                        saltedPassword = password + doc.user.substring(0,3);
                    }
                    if(doc.password === md5(saltedPassword)){
                        req.session.user = doc.user;
                        doc.password = "";
                        req.session.userDoc = doc;
                        users.updateOne({"_id":doc._id}, {"$set":{"lastlogin":Date.now(),"failedTries":0}});
                        res.status(200).json({"ok":true});
                    }else{
                        req.session.user = "";
                        req.session.userDoc = {};
                        users.updateOne({"_id":doc._id}, {"$ic":{"failedTries":1}});
                        res.status(401).json({"error":"Log In Failed"});
                    }
                }else{
                    res.status(401).json({"error":"Log In Failed"});
                }
            }
        });
    });

    router.get('/logout', function(req, res){
        req.session.clear();
        res.status(200).json({"ok":true});
    });

    //Backlog Entries
    router.use(function(req,res,next){
        if((req.session.user||"")===""){
            console.log("Error checking Session");
            res.status(403).json({"error":"Session Not Set"});
        }else{
            next();
        }
    });

    router.get('/getbacklog', function(req, res) {
      product_backlog.find({}).toArray(function(err, docs){
          res.status(200).json(docs);
      });
    });

    router.post('/addtobacklog',function(req,res){
        var doc = {
            code:req.body.code,
            description:req.body.description,
            owner:req.body.owner,
            storyPoints:parseInt(req.body.storypoints),
            creator: (req.body.user || "")
        };

        product_backlog.insertOne(doc, function(err,result){
            if(err){
                res.status(500).json({error:err});
            }else{
                res.status(200).json({resultado:result});
            }
        });
    });

    router.get("/getOneBacklog/:backlogId", function(req,res){
        var query = {_id: new ObjectID(req.params.backlogId)};
        product_backlog.findOne(query,function(err, doc){
            if(err){
                res.status(500).json({"error":"Error al extraer el Backlog"});
            }else{
                res.status(200).json(doc);
            }
        });
    });

    router.post("/upload",
                upload.single('userpic'),
                function(req,res){
                        if(req.file){
                            var query = {_id: new ObjectID(req.body.backlogid)};
                            product_backlog.updateOne(
                                query,
                                {"$push":{"evidences":("img/" + req.file.filename)}},
                                {w:1},
                                function(err,result){
                                    if(err){
                                        res.status(500).json({"error":err});
                                    }else{
                                        res.status(200).json({"path":("img/"+req.file.filename)});
                                    }
                                }
                            );
                        }else{
                            res.status(500).json({"error":"Filesize or Type Error"});
                        }
                });

    router.delete("/delete/:backlogid", function(req,res){
        var query = {_id: new ObjectID(req.params.backlogid)};
        product_backlog.findOneAndDelete(query,{projection:{evidences:1}} ,function(err,docs){
            if(err){
                res.status(500).json({"error":"Cannot delete Backlog"});
            }else{
                if(docs.value.evidence){
                    for(var k = 0; k < docs.value.evidences.length; k++){
                        var deleteimg = path.join(__dirname, '../public/'+docs.value.evidences[k]);
                        fs.unlink(deleteimg, function(err){ console.log(err);});
                    }
                }
                res.status(200).json({"result":docs});
            }
        });
    });

router.get('/addtopost', function(req, res, next) {
  res.render('backlog', { "post": post});
});
router.post('/addtopost', function(req, res, next) {
  var newPost = {
    "user": "",
    "post": req.body.postear,
    "created": Date.now()
  };
  //var query = {_id: new ObjectID(req.params.backlogId)};
   publicaciones.insertOne(newPost, function(err, d){
     if(err){
      res.status(403).json({"error":err});
     }else{
       res.status(200).json({"ok":true});
     }
   });

  });
//});

/*router.get("/addPost", function(req,res){
   var query = {_id: new ObjectID(req.params.backlogId)};
    publicaciones.insert(data, function(err, d){
      if(err){
        handler(err,null);
      }else{
        handler(null, d);
      }
    });
});

router.get('/post', function(req, res, next) {
  obtenerPublicaciones(function(err, Publicaciones){
        if(err) return res.status(404).json({"error":"No se obtiene Datos"});
        return res.status(200).json(Publicaciones);
    });
  });

    router.post('/addPost',function(req,res,next){
      var nuevoPost = {};
      nuevoPost.postear = req.body.postear;
      agregarPublicacion(nuevoPost,function(err, PostAgregado){
        if(err) return res.status(403).json({"error":"error al ingresar publicacion."});
        return res.status(200).json(PostAgregado);
      });

    });

    publicaciones.insertOne(newPost, function(err, result){
        if(err){
            res.status(403).json({"error":err});
        }else{
            res.status(200).json({"ok":true});
        }
    });*/



    return router;
} //getAPIRoutes

module.exports = getAPIRoutes;
