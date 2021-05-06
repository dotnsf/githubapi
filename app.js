//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();
var settings = require( './settings' );

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
  res.redirect( 'https://github.com/login/oauth/authorize?client_id=' + settings.client_id + '&redirect_uri=' + settings.callback_url );
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


app.get( '/', function( req, res ){
  var login = ( req.session.oauth && req.session.oauth.token );
  res.render( 'index', { login: login } );
});


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
