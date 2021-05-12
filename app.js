//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    multer = require( 'multer' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();

app.use( multer( { dest: './tmp/' } ).single( 'file' ) );
app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( express.Router() );
app.use( bodyParser.json() );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

var githubapi = require( './api/github' );
app.use( '/api', githubapi );


app.post( '/file', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.session && req.session.oauth && req.session.oauth.token ){
    //. https://qiita.com/ngs/items/34e51186a485c705ffdb
    var filepath = req.file.path;
    var filetype = req.file.mimetype;
    //var filesize = req.file.size;
    var ext = filetype.split( "/" )[1];
    var filename = req.file.filename;
    var originalfilename = req.file.originalname;

    var r = await githubapi.PushToMyBranch( req, filepath, filetype, originalfilename );

    res.write( JSON.stringify( { result: r }, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { error: 'no access_token' }, null, 2 ) );
    res.end();
  }
});


app.get( '/', function( req, res ){
  //var login = githubapi.isLoggedIn( req );
  res.render( 'index' );
});



var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
