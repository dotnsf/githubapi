//. github.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    router = express();

var settings = require( '../settings' );

router.use( bodyParser.urlencoded( { extended: true } ) );
router.use( bodyParser.json() );

router.use( session({
  secret: 'githubapi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,           //. https で使う場合は true
    maxage: 1000 * 60 * 60   //. 60min
  }
}));

var loggedIns = {};  //. この変数はユーザーセッションごとに用意する必要あり


//app.post( '/login', function( req, res ){
router.get( '/login', function( req, res ){
  //. GitHub API V3
  //. https://docs.github.com/en/developers/apps/authorizing-oauth-apps
  //var ts = ( new Date() ).getTime();
  //res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + settings.client_id + '&redirect_uri=' + settings.callback_url + '&login=dotnsf' );
  res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + settings.client_id + '&redirect_uri=' + settings.callback_url + '&scope=repo' );
});

router.post( '/logout', function( req, res ){
//app.get( '/logout', function( req, res ){
  if( req.session.oauth ){
    if( req.session.oauth.token ){ loggedIns[req.session.oauth.token] = false; }
    req.session.oauth = {};
  }
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true }, null, 2 ) );
  res.end();
});


router.get( '/callback', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var code = req.query.code;
  var option = {
    url: 'https://github.com/login/oauth/access_token',
    form: { client_id: settings.client_id, client_secret: settings.client_secret, code: code, redirect_uri: settings.callback_url },
    method: 'POST'
  };
  request( option, async function( err, res0, body ){
    if( err ){
      console.log( { err } );
    }else{
      //. body = 'access_token=XXXXX&scope=YYYY&token_type=ZZZZ';
      var tmp1 = body.split( '&' );
      for( var i = 0; i < tmp1.length; i ++ ){
        var tmp2 = tmp1[i].split( '=' );
        if( tmp2.length == 2 && tmp2[0] == 'access_token' ){
          var access_token = tmp2[1];

          req.session.oauth = {};
          req.session.oauth.token = access_token;
          loggedIns[access_token] = true;

          var r = await InitMyBranch( req );
          console.log( { r } );
        }
      }
    }
    //console.log( 'redirecting...' );
    res.redirect( '/' );
  });
});



router.get( '/me', function( req, res ){
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

router.get( '/gists', function( req, res ){
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

router.get( '/repos', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  if( req.session && req.session.oauth && req.session.oauth.token && req.session.oauth.login ){
    var option = {
      url: 'https://api.github.com/users/' + req.session.oauth.login + '/repos',
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

router.get( '/files', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  if( req.session && req.session.oauth && req.session.oauth.token && req.session.oauth.sha ){
    var r = await ListFilesOfMyBranch( req );
    console.log( { r } );
    res.write( JSON.stringify( r, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});

router.get( '/file', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var apiurl = req.query.apiurl;
  var filename = req.query.filename;
  if( apiurl && filename && req.session && req.session.oauth && req.session.oauth.token && req.session.oauth.sha ){
    res.contentType( 'application/octet-stream' );
    var r = await GetFileContent( req, apiurl );
    res.setHeader( 'Content-Disposition', 'inline; filename="' + filename + '"' );
    res.end( r, 'binary' );
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});

router.get( '/isLoggedIn', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var status = false;
  if( req.session && req.session.oauth && req.session.oauth.token ){
    status = isLoggedIn( req.session.oauth.token );
  }

  if( !status ){
    res.status( 400 );
  }
  res.write( JSON.stringify( { status: status }, null, 2 ) );
  res.end();
});

function isLoggedIn( token ){
  return ( loggedIns[token] ? true : false );
}


//. ID作成用関数
function generateId(){
  var s = 1000;
  var id = '' + ( new Date().getTime().toString(16) ) + Math.floor( s * Math.random() ).toString(16);

  return id;
}

//. git branch & git checkout & git pull
async function InitMyBranch( req ){
  return new Promise( async function( resolve, reject ){
    if( req.session && req.session.oauth && req.session.oauth.token ){
      var option = {
        url: 'https://api.github.com/user',
        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
        method: 'GET'
      };
      request( option, async function( err, res0, body ){
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
          request( option1, async function( err1, res1, body1 ){
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
              request( option2, async function( err2, res2, body2 ){
                if( err2 ){
                  console.log( { err2 } );
                  resolve( false );
                }else{
                  console.log( { body2 } );  //. { message: 'Reference already exists', .. }
                  //body2 = JSON.parse( body2 );
                  //console.log( { body2 } );

                  //. git checkout
                  //. git pull

                  //. 作成したブランチの SHA 取得（？）
                  var option3 = {
                    url: 'https://api.github.com/repos/' + settings.repo_name + '/git/refs/heads/' + req.session.oauth.id,
                    headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                    method: 'GET'
                  };
                  console.log( { option3 } );
                  request( option3, async function( err3, res3, body3 ){
                    if( err3 ){
                      console.log( { err3 } );
                      resolve( false );
                    }else{
                      body3 = JSON.parse( body3 );
                      console.log( { body3 } );
                      var sha3 = body3.object.sha;
                      req.session.oauth.sha = sha3;

                      //. ファイル一覧取得
                      resolve( true );
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

//. git add & git commit & git push
async function PushToMyBranch( req, filepath, filetype, originalfilename ){
  return new Promise( async function( resolve, reject ){
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
      request( option1, async function( err1, res1, body1 ){
        if( err1 ){
          console.log( { err1 } );
          fs.unlink( filepath, function( e ){} );
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
          request( option2, async function( err2, res2, body2 ){
            if( err2 ){
              console.log( { err2 } );
              fs.unlink( filepath, function( e ){} );
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
              request( option3, async function( err3, res3, body3 ){
                if( err3 ){
                  console.log( { err3 } );
                  fs.unlink( filepath, function( e ){} );
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
                  request( option4, async function( err4, res4, body4 ){
                    if( err4 ){
                      console.log( { err4 } );
                      fs.unlink( filepath, function( e ){} );
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
                      request( option5, async function( err5, res5, body5 ){
                        if( err5 ){
                          console.log( { err5 } );
                          fs.unlink( filepath, function( e ){} );
                          resolve( false );
                        }else{
                          body5 = JSON.parse( body5 );
                          console.log( { body5 } );
                          fs.unlink( filepath, function( e ){} );
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
      if( filepath ){
        fs.unlink( filepath, function( e ){} );
      }
      resolve( false );
    }
  });
}

//. 現在のファイル一覧
//. https://stackoverflow.com/questions/25022016/get-all-file-names-from-a-github-repo-through-the-github-api
async function ListFilesOfMyBranch( req ){
  return new Promise( async function( resolve, reject ){
    if( req.session && req.session.oauth && req.session.oauth.token && req.session.oauth.id && req.session.oauth.sha ){
      //. コミット一覧（不要？）
      var option1 = {
        url: 'https://api.github.com/repos/' + settings.repo_name + '/commits',
        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
        method: 'GET'
      };
      request( option1, async function( err1, res1, body1 ){
        if( err1 ){
          console.log( { err1 } );
          resolve( false );
        }else{
          body1 = JSON.parse( body1 );
          console.log( { body1 } );

          //. インスペクト（これだけでも良さそう）
          var option2 = {
            url: 'https://api.github.com/repos/' + settings.repo_name + '/commits/' + req.session.oauth.sha,
            headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
            method: 'GET'
          };
          request( option2, async function( err2, res2, body2 ){
            if( err2 ){
              console.log( { err2 } );
              resolve( false );
            }else{
              body2 = JSON.parse( body2 );  //. body2 = { commit: {}, url: '', author: {}, files: [], .. }
              console.log( { body2 } );

              //. tree
              var option3 = {
                url: 'https://api.github.com/repos/' + settings.repo_name + '/git/trees/' + body2.sha,
                headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
                method: 'GET'
              };
              request( option3, async function( err3, res3, body3 ){
                if( err3 ){
                  console.log( { err3 } );
                  resolve( false );
                }else{
                  body3 = JSON.parse( body3 );
                  console.log( { body3 } ); //. body3.tree = [ { path: "README.md", size: 130, url: "", .. }, .. ]
    
                  resolve( body3.tree );
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

//. API URL からファイル取り出し
async function GetFileContent( req, apiurl ){
  return new Promise( async function( resolve, reject ){
    if( req.session && req.session.oauth && req.session.oauth.token ){
      var option1 = {
        url: apiurl,
        headers: { 'Authorization': 'token ' + req.session.oauth.token, 'User-Agent': 'githubapi' },
        method: 'GET'
      };
      request( option1, async function( err1, res1, body1 ){
        if( err1 ){
          console.log( { err1 } );
          resolve( false );
        }else{
          body1 = JSON.parse( body1 );
          console.log( { body1 } ); //. body1 = { content: '', encoding: 'base64', .. }
  
          var bin = Buffer.from( body1.content, body1.encoding );
          resolve( bin );
        }
      });
    }else{
      resolve( false );
    }
  });
}


//. router をエクスポート
module.exports = router;