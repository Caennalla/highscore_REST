var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');

//These will be replaced with docker container data for mysql server
var pool = mysql.createPool({
	connectionLimit: 100,
	hostname: "localhost",
	user: "admin",
	password: "1234",
	database: "alphaworm",
	debug: false
});

// A few parser functions for later use
var rawBodySaver = function(req, res, buf, encoding){
	if(buf && buf.length){
		req.rawBody = buf.toString(encoding || 'utf8');
	}
};

var jsonParser = bodyParser.json({verify: rawBodySaver});

// Init
var app = express();

app.get('/highscore', function(req, res){
	var query = 'SELECT * FROM userdata';

	pool.getConnection(function (err, connection) {
	    if (err) {
	        console.log("Error: ", err);
	    }
	    else if (connection) {
	        connection.query(query, function (err, rows, fields) {
	            connection.release();
	            console.log(rows);
	            if (err) {
	                console.log("Error: ", err);
	            }
	            else{
	            	res.send(JSON.stringify(rows));
	            }
	        })
	    }
	    else {
	        console.log("No connection");
	    }
	});
});

// Post function to post high scores
// This requires a json-body when called
// By definition these should not be able to be called without having existing userdata in the game components
app.post('/highscore', jsonParser, function(req,res){
	if(!req.body) res.json({"message": "no data"});

	//Save the username for checking for it
	var username = req.body.username;
	if(!username) res.json({"message": "no username given"});

	//Create a json-object from the data given. Variable names must match the ones in the mySQL table
	var json_object = {
		username: req.body.username,
		highscore: req.body.highscore
	}
	//First query to check for existing data
	var searchQuery = 'SELECT * from userdata WHERE username = ?';
	console.log(json_object.username);

	pool.getConnection(function (err, connection) {
	    if (err) {
	        console.log("Error: ", err);
	    }
	    else if (connection) {
	    	//First we'll check if we can find something with the given username
	        connection.query(searchQuery, username, function (err, rows, fields) {
	        	//console.log(rows.length);
	            if (err) {
	                console.log("Error: ", err);
	                connection.release();
	            }
	            else{
	            	//If there is anything found, update data
	            	if(rows.length > 0){
	            		// Update the query variable
	            		var query = 'UPDATE userdata SET highscore=? WHERE username = ? AND ? > highscore';
	            		// Execute mySQL command
	            		connection.query(query, [json_object.highscore, json_object.username, json_object.highscore], function (err, rows, fields) {
            				connection.release();
	            			if(err){
	            				console.log("Error: ", err);
	            			}
	            			else{
	            				console.log("Updated data in database");
	            				res.json({"message": "Data updated"});
	            			}
            			});
	            	}
	            	else{
	            		connection.release();
	            		res.json({"message": "There were no users with given name"});
	            	}
	            }
	        });
	    }
	    else {
	        console.log("No connection");
	    }
	});
});

//For local testing
app.listen(8080);
console.log("Server is running on 8080");