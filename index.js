/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var http = require('http');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var db;
var url = "mongodb://localhost:27017/userinfo";  // for localhost
// var url = "mongodb://calm-crag-26465.herokuapp.com/mydb";  for server deploy
var app = http.createServer(function (request, response) {
    response.writeHead(200, {"Context-Type": "text/html"});
    fs.createReadStream("./home.html").pipe(response);  // returns the home page
});

var io = require('socket.io')(app);

io.on('connection', onRequest);

function onRequest(socket) {


    // TODO populate questions in this list
    socket.questions = {};

    console.log("socket.id: " + socket.id);
    db.collection("users").insertOne({socketID: socket.id});
    socket.on('RecieveNewQuestion', function (msg) {
        if (!(msg == "" || msg == null)) {

            // sends the question back to the client after some validations 
            // this event on the client side is responsible to show the question in the user's question area
            // TODO perform validations
            db.collection("users").update({socketID: socket.id}, {$set: {curr_ques: msg}}, function (err, obj) {
                if (err)
                    throw err;
                // success
            });

            updateUsersQuestionList(socket, io.sockets.sockets);
            socket.emit('AddNewQuestionToList', socket.questions);
        }
    });

    socket.on('UpdatePosition', function (position) {
        db.collection("users").update({socketID: socket.id}, {$set: {coords: position.coords}}, function (err, obj) {
            if (err)
                throw err;
            updateUsersQuestionList(socket, io.sockets.sockets);
            socket.emit('AddNewQuestionToList', socket.questions);
        });
    });

    socket.on('disconnect', function () {
        console.log('disconnect: ' + socket.id);
        var query = {socketID: socket.id};
        db.collection("users").remove(query, function (err, obj) {
            if (err)
                throw err;
            Object.keys(io.sockets.sockets).forEach(function (id) {
                if (io.sockets.sockets[id].questions[id])
                    delete io.sockets.sockets[id].questions[socket.id];
            });
            console.log(obj.result.n + " document(s) deleted");
        });
        console.log('disconnect');
    });
}
;

// will populate the socket.questions property with questions of people within 2km radius
function updateUsersQuestionList(socket, sockets) {
    db.collection("users").findOne({socketID: socket.id}, function (err, result) {
        if (err)
            throw err;
        user = result;
        var coords1 = user.coords;
        if (coords1) {
            var coords2;
            Object.keys(sockets).forEach(function (id) {
                db.collection("users").findOne({socketID: id}, function (err, result) {
                    if (err)
                        throw err;
                    coords2 = result.coords;
                    if (coords2 && getDistanceFromLatLonInKm(coords1.latitude, coords1.longitude, coords2.latitude, coords2.longitude) < 2) {
                        socket.questions[id] = result.curr_ques;
                    } else {
                        if (socket.questions[id])
                            delete socket.questions[id];
                    }
                });
            });
        }
    });
}

// near by = 2km
function sendQuesToNearByUsers(sID, sockets) {
    console.log("sendQues socket.id: " + sID);
    var user;
    db.collection("users").findOne({socketID: sID}, function (err, result) {
        if (err)
            throw err;
        user = result;
        var coords1 = user.coords;
        var ques = user.curr_ques;
        if (ques) {
            var coords2;
            Object.keys(sockets).forEach(function (id) {
                db.collection("users").findOne({socketID: id}, function (err, result) {
                    if (err)
                        throw err;
                    coords2 = result.coords;
                    if (getDistanceFromLatLonInKm(coords1.latitude, coords1.longitude, coords2.latitude, coords2.longitude) < 2) {
                        sockets[id].emit('AddNewQuestionToList', ques);
                    } else {
                        // inappropriate distance
                    }
                });
            });
        }
    });
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;  // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;  // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

MongoClient.connect(url, function (err, database) {
    if (err)
        throw err;
    db = database;
    console.log('database connected!');
    // app.listen((process.env.PORT || 8080));  for server deploy
    app.listen(8080);  // for localhost
    console.log("server is running...");
});