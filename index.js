/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var http = require('http');
var fs = require('fs');
var app = http.createServer(function (request, response) {
    response.writeHead(200, {"Context-Type": "text/html"});
    fs.createReadStream("./home.html").pipe(response);  // returns the home page
});

var io = require('socket.io')(app);

io.on('connection', onRequest);

function onRequest(socket) {
    socket.on('RecieveNewQuestion', function (msg) {
        if (!(msg == "" || msg == null)) {

            // sends the question back to the client after some validations 
            // this event on the client side is responsible to show the question in the user's question area
            // TODO perform validations
            socket.emit('AttachNewQuestion', msg);

            // send to nearby people so they can reply
            Object.keys(io.sockets.sockets).forEach(function (id) {
                console.log("ID:", id);  // socketId
                if (getDistanceFromLatLonInKm(socket.coords.latitude, socket.coords.longitude,
                        io.sockets.sockets[id].coords.latitude, io.sockets.sockets[id].coords.longitude) < 2) {
                    io.sockets.sockets[id].emit('AddNewQuestionToList', msg);
                } else {
                    console.log(getDistanceFromLatLonInKm(socket.coords.latitude, socket.coords.longitude, io.sockets.sockets[id].coords.latitude, io.sockets.sockets[id].coords.longitude));
                }
            });
        }
    });
    socket.on('UpdatePosition', function (position) {
        console.log(position);
        socket.coords = position.coords;
        Object.keys(io.sockets.sockets).forEach(function (id) {
            console.log("ID:", id);  // socketId
            console.log('Pos:', io.sockets.sockets[id].coords);
        })
    });
}
;


io.on('disconnect', function (socket) {
    console.log('disconnect');
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

app.listen((process.env.PORT || 8080));
 // app.listen(8080);
console.log("server is running...");