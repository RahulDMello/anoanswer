/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var http = require('http');
var fs = require('fs');
var app = http.createServer(function(request, response) {
        response.writeHead(200, {"Context-Type": "text/html"});
        fs.createReadStream("./home.html").pipe(response);
});

var io = require('socket.io')(app);

io.on('connection', onRequest);

function onRequest(socket) {
    socket.on('RecieveNewQuestion', function(msg){
        if (!(msg == "" || msg == null)) {
            socket.emit('AttachNewQuestion', msg);
            // send to nearby people so they can reply
        }
    });
};


io.on('disconnect', function(socket){
    console.log('disconnect');
});

app.listen(8080);
console.log("server is running...");