//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    app = express();

app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( express.Router() );
app.use( bodyParser.json() );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

var githubapi = require( './api/github' );
app.use( '/api', githubapi );


app.get( '/', function( req, res ){
  //var login = githubapi.isLoggedIn( req );
  res.render( 'index' );
});



var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
