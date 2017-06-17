/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var http = require('http');
// file system ?
var fs = require('fs');
// mongoclient to connect with db
var MongoClient = require('mongodb').MongoClient;
// initialized when MongoClient is connected to the mongodb
var db;
// url to the database
var url = "mongodb://localhost:27017/userinfo";  // for localhost
// var url = "mongodb://calm-crag-26465.herokuapp.com/userinfo";  for server deploy

// when someone requests the root '/' page
var app = http.createServer(function (request, response) {
    response.writeHead(200, {"Context-Type": "text/html"});
    fs.createReadStream("./home.html").pipe(response);  // returns the home page
});

// socket.io object to communicate with client
var io = require('socket.io')(app);

// on connection event use onRequest funtion
io.on('connection', onRequest);

// yeah this function it takes the client's socket as argument
// apparantly this obj is a copy and they cant share self made properties
function onRequest(socket) {

    // self made property
    // its populated with power of friendship and questions of your neighbours and their ids
    socket.questions = {};

    // just log out the id for sanity check
    console.log("socket.id: " + socket.id);
    
    // init this guy or girl in the db using the associated socket.id
    db.collection("users").insertOne({socketID: socket.id});
    
    // if this socket sends in a question to be accepted by the all mighty it gets validated, processed and passed on here
    socket.on('RecieveNewQuestion', function (msg) {
        if (!(msg == "" || msg == null)) {

            // sends the question back to the client after some validations 
            // this event on the client side is responsible to show the question in the user's question area
            // TODO perform validations
            db.collection("users").update({socketID: socket.id}, {$set: {curr_ques: msg}}, function (err, obj) {
                if (err)
                    throw err;
                // success
                socket.emit('AttachNewQuestion', msg); // he may set this question as his current question
                updateUsersQuestionList(socket, io.sockets.sockets); // gotta update question list for everyone now that we have one more question in the market
            });
        }
    });

    // aye aye i will gladly accept your new position and have my way with it muahahahah!
    socket.on('UpdatePosition', function (position) {
        // update position for this socket in the database
        db.collection("users").update({socketID: socket.id}, {$set: {coords: position.coords}}, function (err, obj) {
            if (err)
                throw err;
            // if successful update question list cuz he may have travelled super quick like a speedster and maybe now everything's changed including the poeple around him and their questions
            updateUsersQuestionList(socket, io.sockets.sockets);
        });
    });
    
    socket.on('newReply', function(obj) {
        db.collection("users").update({socketID: obj.socketID}, {$push: {replys: obj.reply}});
        socket.emit('approvedReply', obj);
    })
    
    socket.on('requestReplyList', function(sID){
        if(sID){
            db.collection("users").findOne({socketID: sID}, function (err, result) {
                var replies = result.replys;
                socket.emit("replyList", {socketID: sID, reply: replies});
            });
        } else {
            console.log(sID);
        }
    });

    // NOOOO DONT LEAVE US PLEASE NOOOOO 
    // if you do though lemme clear your document from db and your id and question from other people's sockets 
    // just giving them an update nothing to worry about 
    // bye we may miss you
    socket.on('disconnect', function () {
        var query = {socketID: socket.id};
        // remove associated doc from db
        db.collection("users").remove(query, function (err, obj) {
            if (err)
                throw err;
            // if successful remove his question from other sockets
            Object.keys(io.sockets.sockets).forEach(function (id) {
                if (io.sockets.sockets[id].questions[socket.id])  // if it exist
                    delete io.sockets.sockets[id].questions[socket.id];
            });
            // sanity check for how many got deleted
            console.log(obj.result.n + " document(s) deleted");
        });
        // sanity check for who got deleted
        console.log('disconnect: ' + socket.id);
    });
}
;

// will populate the socket.questions property with questions of people within 2km radius
function updateUsersQuestionList(socket, sockets) {
    // fetch me that slugger
    db.collection("users").findOne({socketID: socket.id}, function (err, result) {
        if (err)
            throw err;
        user = result;  // useless but at this point i am too afraid to change anything
        var coords1 = user.coords;  // where the hell is he ayy ?
        if (coords1) {
            // found you muahahhaha!
            // bring everyone here get me everyone you hear me EVERYONE EVERYONEEEEE! may i request them to be in an array pls. thanks
            db.collection("users").find().toArray(function (err, result) {
                if (err)
                    throw err;

                // loop throw everyone to update their questions
                for (var i = 0, l = result.length; i < l; i++) {
                    var coords2 = result[i].coords;
                    // check for where we have his coords and if he is nearby (2km)
                    if (coords2 && getDistanceFromLatLonInKm(coords1.latitude, coords1.longitude, coords2.latitude, coords2.longitude) < 2) {
                        socket.questions[result[i].socketID] = result[i].curr_ques;  // add if nearby
                    } else {
                        if (socket.questions[result[i].socketID])
                            delete socket.questions[result[i].socketID];  // delete if he is no more nearby, because thats how we roll xD
                    }
                }
                
                // aite i will let the client side know to update his list and we donezo woooohoooo!!!
                socket.emit('AddNewQuestionToList', socket.questions);

            });
        }
    });
}

// courtesy of stackoverflow
// yes get me that distance. the returned value is apparently in kms how convenient
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

// the above function needs radian values and not degrees >.>
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// client connects with the db using the specified url (loop above)
MongoClient.connect(url, function (err, database) {
    if (err)
        throw err;
    // if successful
    db = database;  // like promised
    // again, sanity check
    console.log('database connected!');
    
    // specify port
    // app.listen((process.env.PORT || 8080));  for server deploy
    app.listen(8080);  // for localhost
    
    // we made it. it, its so beautiful (*^▽^*)
    console.log("server is running...");
});