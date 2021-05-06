//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    multer = require( 'multer' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();
var settings = require( './settings' );

app.use( multer( { dest: './tmp/' } ).single( 'file' ) );
app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( express.Router() );
app.use( bodyParser.json() );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

app.use( session({
  secret: 'githubapi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,           //. https で使う場合は true
    maxage: 1000 * 60 * 60   //. 60min
  }
}));

//app.post( '/api/login', function( req, res ){
app.get( '/api/login', function( req, res ){
  //. GitHub API V3
  //. https://docs.github.com/en/developers/apps/authorizing-oauth-apps
  //var ts = ( new Date() ).getTime();
  //res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + settings.client_id + '&redirect_uri=' + settings.callback_url + '&login=dotnsf' );
  res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + settings.client_id + '&redirect_uri=' + settings.callback_url + '&scope=repo' );
});

app.post( '/api/logout', function( req, res ){
//app.get( '/api/logout', function( req, res ){
  req.session.oauth = {};
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true }, null, 2 ) );
  res.end();
});


app.get( '/api/callback', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var code = req.query.code;
  var option = {
    url: 'https://github.com/login/oauth/access_token',
    form: { client_id: settings.client_id, client_secret: settings.client_secret, code: code, redirect_uri: settings.callback_url },
    method: 'POST'
  };
  request( option, function( err, res0, body ){
    if( err ){
      console.log( { err } );
      res.status( 400 );
      res.write( JSON.stringify( err, null, 2 ) );
      res.end();
    }else{
      //. body = 'access_token=XXXXX&scope=YYYY&token_type=ZZZZ';
      body.split( '&' ).forEach( function( tmp1 ){
        var tmp2 = tmp1.split( '=' );
        if( tmp2.length == 2 && tmp2[0] == 'access_token' ){
          var access_token = tmp2[1];

          req.session.oauth = {};
          req.session.oauth.token = access_token;

          CreateMyBranch( req );
        }
      });

      /*
      res.write( JSON.stringify( { access_token }, null, 2 ) );
      res.end();
      */
      res.redirect( '/' );
    }
  });
});

app.get( '/api/me', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  if( req.session && req.session.oauth && req.session.oauth.token ){
    var option = {
      url: 'https://api.github.com/user',
      headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
      //json: {},
      method: 'GET'
    };
    request( option, function( err, res0, body ){
      if( err ){
        console.log( { err } );
        res.status( 400 );
        res.write( JSON.stringify( err, null, 2 ) );
        res.end();
      }else{
        body = JSON.parse( body );
        //. body = { login: 'dotnsf', id: XXXXXX, avatar_url: 'xxx', name: 'きむらけい', email: 'xxx@xxx', created_at: 'XX', updated_at: 'XX', ... }
        req.session.oauth.id = body.id;
        req.session.oauth.login = body.login;
        req.session.oauth.name = body.name;
        req.session.oauth.email = body.email;
        req.session.oauth.avatar_url = body.avatar_url;

        //. https://qiita.com/nysalor/items/68d2463bcd0bb24cf69b

        //. main ブランチの SHA 取得
        var option1 = {
          url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs/heads/main',
          headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
          method: 'GET'
        };
        console.log( { option1 } );
        request( option1, function( err1, res1, body1 ){
          if( err1 ){
            console.log( { err1 } );
            res.status( 400 );
            res.write( JSON.stringify( err1, null, 2 ) );
            res.end();
          }else{
            body1 = JSON.parse( body1 );
            console.log( { body1 } );  //. body1 = { message: 'Git Repository is empty.', documentation_url 'xxx' }
            var sha1 = body1.object.sha;

            //. ブランチ作成
            var data2 = {
              ref: 'refs/heads/' + req.session.oauth.id,
              sha: sha1
            };
            var option2 = {
              url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs',
              headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi', 'Accept': 'application/vnd.github.v3+json' },
              json: data2,
              method: 'POST'
            };
            request( option2, function( err2, res2, body2 ){
              if( err2 ){
                console.log( { err2 } );
                res.status( 400 );
                res.write( JSON.stringify( err2, null, 2 ) );
                res.end();
              }else{
                console.log( 'body2', body2 );  //. { message: 'Reference already exists', .. }
                //body2 = JSON.parse( body2 );
                //console.log( { body2 } );
              }
            });
          }
        });

        res.write( JSON.stringify( body, null, 2 ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});

app.get( '/api/gists', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  if( req.session && req.session.oauth && req.session.oauth.token ){
    var option = {
      url: 'https://api.github.com/gists',
      headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi', 'Accept': 'application/vnd.github.v3+json' },
      //json: {},
      method: 'GET'
    };
    request( option, function( err, res0, body ){
      if( err ){
        console.log( { err } );
        res.status( 400 );
        res.write( JSON.stringify( err, null, 2 ) );
        res.end();
      }else{
        body = JSON.parse( body );
        //. body = { login: 'dotnsf', id: XXXXXX, avatar_url: 'xxx', name: 'きむらけい', email: 'xxx@xxx', created_at: 'XX', updated_at: 'XX', ... }
        res.write( JSON.stringify( body, null, 2 ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});

app.get( '/api/repos', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  if( req.session && req.session.oauth && req.session.oauth.token ){
    var option = {
      url: 'https://api.github.com/users/dotnsf/repos',
      headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi', 'Accept': 'application/vnd.github.v3+json' },
      //json: {},
      method: 'GET'
    };
    request( option, function( err, res0, body ){
      if( err ){
        console.log( { err } );
        res.status( 400 );
        res.write( JSON.stringify( err, null, 2 ) );
        res.end();
      }else{
        body = JSON.parse( body );
        //. body = { login: 'dotnsf', id: XXXXXX, avatar_url: 'xxx', name: 'きむらけい', email: 'xxx@xxx', created_at: 'XX', updated_at: 'XX', ... }
        res.write( JSON.stringify( body, null, 2 ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});


app.post( '/api/file', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.session && req.session.oauth && req.session.oauth.token ){
    //. https://qiita.com/ngs/items/34e51186a485c705ffdb
    var filepath = req.file.path;
    var filetype = req.file.mimetype;
    //var filesize = req.file.size;
    var ext = filetype.split( "/" )[1];
    var filename = req.file.filename;
    var originalfilename = req.file.originalname;

    var data1 = {};
    if( filetype.startsWith( 'text' ) ){
      //. text
      var text = fs.readFileSync( filepath );
      data1 = {
        content: text,
        encoding: 'utf-8'
      };
    }else{
      //. binary
      var bin = fs.readFileSync( filepath );
      data1 = {
        content: new Buffer( bin ).toString( 'base64' ),
        encoding: 'base64'
      };
    }

    //. BLOB 作成
    var option1 = {
      url: 'https://api.github.com/repos/' + settings.repo_name + '/git/blobs',
      headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
      json: data1,
      method: 'POST'
    };
    request( option1, function( err1, res1, body1 ){
      if( err1 ){
        console.log( { err1 } );
        res.status( 400 );
        res.write( JSON.stringify( err1, null, 2 ) );
        res.end();
      }else{
        body1 = JSON.parse( body1 );
        //. body1 = { url: 'XXXXX', sha: 'XXXXXX' }
        console.log( { body1 } );
        var sha1 = body1.sha;

        //. Tree 作成
        var data2 = {
          tree : [{
            path: originalfilename,
            mode: '100644',
            type: 'blob',
            sha: sha1
          }]
        };
        var option2 = {
          url: 'https://api.github.com/repos/' + settings.repo_name + '/git/trees',
          headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
          json: data2,
          method: 'POST'
        };
        request( option2, function( err2, res2, body2 ){
          if( err2 ){
            console.log( { err2 } );
            res.status( 400 );
            res.write( JSON.stringify( err2, null, 2 ) );
            res.end();
          }else{
            body2 = JSON.parse( body2 );
            console.log( { body2 } );
            var sha2 = body2.sha;

            //. 現在の Commit の SHA を取得
            var option3 = {
              url: 'https://api.github.com/repos/' + settings.repo_name + '/branches/' + req.session.oauth.id,
              headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
              method: 'GET'
            };
            request( option3, function( err3, res3, body3 ){
              if( err3 ){
                console.log( { err3 } );
                res.status( 400 );
                res.write( JSON.stringify( err3, null, 2 ) );
                res.end();
              }else{
                body3 = JSON.parse( body3 );
                console.log( { body3 } );
                var sha3 = body3.commit.sha;

                //. Commit を作成
                var ts = ( new Date() ).getTime();
                var data4 = {
                  message: '' + ts,
                  tree: sha2,
                  parents: [ sha3 ]
                };
                var option4 = {
                  url: 'https://api.github.com/repos/' + settings.repo_name + '/git/commits',
                  headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                  json: data4,
                  method: 'POST'
                };
                request( option4, function( err4, res4, body4 ){
                  if( err4 ){
                    console.log( { err4 } );
                    res.status( 400 );
                    res.write( JSON.stringify( err4, null, 2 ) );
                    res.end();
                  }else{
                    body4 = JSON.parse( body4 );
                    console.log( { body4 } );
                    var sha4 = body4.sha;

                    //. リファレンスを更新
                    var data5 = {
                      force: false,
                      sha: sha4
                    };
                    var option5 = {
                      url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs/heads/' + req.session.oauth.id,
                      headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                      json: data5,
                      method: 'PATCH'
                    };
                    request( option5, function( err5, res5, body5 ){
                      if( err5 ){
                        console.log( { err5 } );
                        res.status( 400 );
                        res.write( JSON.stringify( err5, null, 2 ) );
                        res.end();
                      }else{
                        body5 = JSON.parse( body5 );
                        console.log( { body5 } );
    
                        res.write( JSON.stringify( body5, null, 2 ) );
                        res.end();
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});


app.get( '/', function( req, res ){
  var login = ( req.session.oauth && req.session.oauth.token );
  res.render( 'index', { login: login } );
});



//. git branch & git checkout & git pull
function CreateMyBranch( req ){
  return new Promise( function( resolve, reject ){
    if( req.session && req.session.oauth && req.session.oauth.token ){
      var option = {
        url: 'https://api.github.com/user',
        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
        method: 'GET'
      };
      request( option, function( err, res0, body ){
        if( err ){
          console.log( { err } );
          resolve( false );
        }else{
          body = JSON.parse( body );
          //. body = { login: 'dotnsf', id: XXXXXX, avatar_url: 'xxx', name: 'きむらけい', email: 'xxx@xxx', created_at: 'XX', updated_at: 'XX', ... }
          //req.session.oauth = {};
          req.session.oauth.id = body.id;
          req.session.oauth.login = body.login;
          req.session.oauth.name = body.name;
          req.session.oauth.email = body.email;
          req.session.oauth.avatar_url = body.avatar_url;

          //. https://qiita.com/nysalor/items/68d2463bcd0bb24cf69b

          //. main ブランチの SHA 取得
          var option1 = {
            url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs/heads/main',
            headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
            method: 'GET'
          };
          console.log( { option1 } );
          request( option1, function( err1, res1, body1 ){
            if( err1 ){
              console.log( { err1 } );
              resolve( false );
            }else{
              body1 = JSON.parse( body1 );
              console.log( { body1 } );  //. body1 = { message: 'Git Repository is empty.', documentation_url 'xxx' }  ->  あらかじめリポジトリの main ブランチに README.md などを登録しておくことで回避
              var sha1 = body1.object.sha;
  
              //. ブランチ作成
              var data2 = {
                ref: 'refs/heads/' + req.session.oauth.id,
                sha: sha1
              };
              var option2 = {
                url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs',
                headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi', 'Accept': 'application/vnd.github.v3+json' },
                json: data2,
                method: 'POST'
              };
              request( option2, function( err2, res2, body2 ){
                if( err2 ){
                  console.log( { err2 } );
                  resolve( false );
                }else{
                  console.log( 'body2', body2 );  //. { message: 'Reference already exists', .. }
                  //body2 = JSON.parse( body2 );
                  //console.log( { body2 } );

                  //. git checkout

                  //. git pull

                  //. ファイル一覧取得
                  resolve( true );
                }
              });
            }
          });
        }
      });
    }else{
      resolve( false );
    }
  });
}


//. git add & git commit & git push
function PushToMyBranch( req, filepath, filetype ){
  return new Promise( function( resolve, reject ){
    if( req.session && req.session.oauth && req.session.oauth.token && req.session.oauth.id ){
      var data1 = {};
      if( filetype.startsWith( 'text' ) ){
        //. text
        var text = fs.readFileSync( filepath );
        data1 = {
          content: text,
          encoding: 'utf-8'
        };
      }else{
        //. binary
        var bin = fs.readFileSync( filepath );
        data1 = {
          content: new Buffer( bin ).toString( 'base64' ),
          encoding: 'base64'
        };
      }
  
      //. BLOB 作成
      var option1 = {
        url: 'https://api.github.com/repos/' + settings.repo_name + '/git/blobs',
        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
        json: data1,
        method: 'POST'
      };
      request( option1, function( err1, res1, body1 ){
        if( err1 ){
          console.log( { err1 } );
          resolve( false );
        }else{
          body1 = JSON.parse( body1 );
          //. body1 = { url: 'XXXXX', sha: 'XXXXXX' }
          console.log( { body1 } );
          var sha1 = body1.sha;
  
          //. Tree 作成
          var data2 = {
            tree : [{
              path: originalfilename,
              mode: '100644',
              type: 'blob',
              sha: sha1
            }]
          };
          var option2 = {
            url: 'https://api.github.com/repos/' + settings.repo_name + '/git/trees',
            headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
            json: data2,
            method: 'POST'
          };
          request( option2, function( err2, res2, body2 ){
            if( err2 ){
              console.log( { err2 } );
              resolve( false );
            }else{
              body2 = JSON.parse( body2 );
              console.log( { body2 } );
              var sha2 = body2.sha;

              //. 現在の Commit の SHA を取得
              var option3 = {
                url: 'https://api.github.com/repos/' + settings.repo_name + '/branches/' + req.session.oauth.id,
                headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                method: 'GET'
              };
              request( option3, function( err3, res3, body3 ){
                if( err3 ){
                  console.log( { err3 } );
                  resolve( false );
                }else{
                  body3 = JSON.parse( body3 );
                  console.log( { body3 } );
                  var sha3 = body3.commit.sha;

                  //. Commit を作成
                  var ts = ( new Date() ).getTime();
                  var data4 = {
                    message: '' + ts,
                    tree: sha2,
                    parents: [ sha3 ]
                  };
                    var option4 = {
                    url: 'https://api.github.com/repos/' + settings.repo_name + '/git/commits',
                    headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                    json: data4,
                    method: 'POST'
                  };
                  request( option4, function( err4, res4, body4 ){
                    if( err4 ){
                      console.log( { err4 } );
                      resolve( false );
                    }else{
                      body4 = JSON.parse( body4 );
                      console.log( { body4 } );
                      var sha4 = body4.sha;
  
                      //. リファレンスを更新
                      var data5 = {
                        force: false,
                        sha: sha4
                      };
                      var option5 = {
                        url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs/heads/' + req.session.oauth.id,
                        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                        json: data5,
                        method: 'PATCH'
                      };
                      request( option5, function( err5, res5, body5 ){
                        if( err5 ){
                          console.log( { err5 } );
                          resolve( false );
                        }else{
                          body5 = JSON.parse( body5 );
                          console.log( { body5 } );
                          resolve( true );
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }else{
      resolve( false );
    }
  });
}


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
