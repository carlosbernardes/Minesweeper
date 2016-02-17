var validator = require('validator');
var connect = require('connect');
var cors = require('cors');
var http = require('http');
var crypto = require('crypto');
var mysql= require('mysql');
var chance = require('chance');
var salt = crypto.createHash('md5');
var bodyParser = require('body-parser');
var corsOpts = { origin: '*' };
var app = connect();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

 app.use(cors(corsOpts)).use(function (req, res, next) { 
 	//console.log(req.method);
  	//console.log(req.url);
  	if(req.url === '/register' && req.method === 'POST')
  		register(req,res);
  	else
  		if(req.url === '/ranking' && req.method === 'POST')
  			ranking(req, res);

  }).listen(8020);

console.log("Server running on 8020");

var conn = mysql.createConnection({
 host : 'localhost', 
 user : 'up201303171',
 password : 'up201303171',
 database : 'up201303171'
});

conn.connect(function(err) {
 if (err) {
 console.log("not able to connect DB");
 } else {
 console.log('Connected!');
 }
});

function register(req , res){
	res.setHeader('Content-Type', 'application/json');

	var somedata = {}; // return this object if JSON req is okay

	console.log(req.body);

	if( !verify(req) ){
		somedata = "Utilizador ou password incorrectos";
		res.end(JSON.stringify(somedata));
	}
	else
		registerDB(req,res,somedata);				
}

function ranking(req , res){

	var somedata = {};
	res.setHeader('Content-Type', 'application/json');

	if( verify(req) )
		rankingDB(req,res,somedata);
	else{
		somedata.error="Invalid parameter";
		res.end(JSON.stringify(somedata));
		return;
	}	
}

function rankingDB(req, res, somedata){	
	var query = conn.query("SELECT * FROM Rankings WHERE level=? ORDER BY score DESC, timestamp ASC LIMIT 10", [req.body.level] , function(err, result){
		if(err){
			console.log(err);
			return;
		}

		var somedata = {
			"ranking" : []
		}
		
		var ranking = [];
		
		if( result.length > 0){

			for(var i=0; i < result.length ; i++)
				ranking.push( new ranks(result[i].name , result[i].score) );
			
			somedata["ranking"] = ranking;
			res.end( JSON.stringify(somedata) );
		}
	});
}

function ranks(name, score){
	this.name = name;
	this.score = score;
}

function registerDB(req , res , somedata){
	var query = conn.query("SELECT * FROM Users WHERE name=?", [ req.body.name ], function(err, result) {
			
		if(err){
			console.error(err);
			return;
		}
		
		if(result.length > 0){
		
		//	console.error(result);
			var string=JSON.stringify(result);
			var json =  JSON.parse(string);

			var user_salt = json[0].salt;
			var seq = crypto.createHash('md5').update(req.body.pass+user_salt).digest('hex');
			
			if(json[0].pass === seq)
				res.end(JSON.stringify(somedata));
			else{
				somedata.error="Utilizador ou password incorrectos";
				//res.writeHead(401,"Utilizador ou password incorrectos");
				res.end(JSON.stringify(somedata));
				return;
				}
		}
		else{
			chance = new chance();
			var sal = chance.string({length: 4});			
			var seq = crypto.createHash('md5').update(req.body.pass+sal).digest('hex');
			insertDB(req.body.name, seq,somedata,res,sal);
		}
			//console.log(query.sql) //mostra a consulta sql 
	 });		
}

function insertDB(name, pass, somedata,res,sal){
	var q = conn.query('INSERT INTO Users SET name=?, pass=?, salt=?', [name,pass,sal], function(err, result){
		if(err)
			conn.rollback(function() { throw err; });
		else{
  			//console.error(result);
  			res.end(JSON.stringify(somedata));
		}
	});
}

function verify(req){

	if(req.url === '/register'){
		var user = req.body.name;
		if( validator.isAlphanumeric(user) )
			return true;
		else
			return false;
	}
	else
		if( req.url === '/ranking' ){
			var lvl = req.body.level;
			if( validator.isAlpha(lvl) && ( lvl === "beginner" || lvl === "intermediate" || lvl === "expert") )
				return true;
			else
				return false;
		}
}
