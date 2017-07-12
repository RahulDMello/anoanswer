/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

// init socket
// var socket = io('http://localhost:8080');  for localhost
var socket = io('https://calm-crag-26465.herokuapp.com/');  // for server deploy

// questions and replys
var questions = {};

var CURRENT_COORDS;

// used to process enter submitting in the input field txtInput
// txtInput takes the input for current question
function isEnterKey(event) {
    var check = validate();  // validate to see if the question is blank or not
    // keycode 13 is the enter key
    // TODO show some sort of message or make the field red for some secs if the text is blank and user pressed enter
    if (event.keyCode === 13) {
        if (check) {
            document.getElementById("boxInput").class = "form-group";
            updateQuestion();
        } else {
            document.getElementById("boxInput").class = "form-group has-error";
        }
    }
}

function  submitReply(event) {
    var txtArea = event.target;
    var socketID = txtArea.getAttribute("data-sid");
    var strvalue = txtArea.value.trim();
    if (event.keyCode === 13 && !(strvalue === "") && !event.shiftKey) {
        console.log('textArea.value: '+strvalue);
        socket.emit('newReply', {socketID: socketID, reply: strvalue});
        txtArea.value = '';
    }
}

socket.on('approvedReply', function (obj) {
    document.getElementById('replylist' + obj.socketID).innerHTML += "<div class='reply'>" + obj.reply + "</div>";
});

// checks whether the question is blank or not
// true = not blank
function validate() {
    var str = document.getElementById("txtInput").value;
    document.getElementById("submit").disabled = (str === "" || str == null);
    return !(str === "");
}

// emits an event to set current question and perform further processing on the server side
function updateQuestion() {
    socket.emit('RecieveNewQuestion', document.getElementById('txtInput').value);
    document.getElementById('txtInput').value = "";
    validate();
}

// event responds back with the current question after validating it 
// so we can set it as our current question in the navbar
socket.on('AttachNewQuestion', function (msg) {
    document.getElementById('currQues').innerHTML = " Current Question: " + msg;
});

// TODO refactor this event
// msg contains a list of questions and socketIDs of other clients within 2km radius
socket.on('AddNewQuestionToList', function (msg) {
    console.log(count + ': addnewquestiontolist');
    console.log('new questions yay!' + msg);
    Object.keys(questions).forEach(function (key) {
        if (msg[key]) {
            if (msg[key] !== questions[key]) {
                document.getElementById(key).innerHTML = "<div style='width:100%'><h4>🠶 " + msg[key] + "</h4></div>";
                questions[key] = msg[key];
                var replyID = "reply" + key;
                document.getElementById(replyID).innerHTML = "<div id='editable' style='replyHolder'>\n\
                            <textarea placeholder='Reply to the question...' style='width:100%' rows='3' onkeyup=submitReply(event) data-sid='" + key + "'></textarea>\n\
                            <div id='replylist" + key + "'>\n\
                                    </div>\n\
                        </div>";
            }
        } else {
            var element = document.getElementById('tr' + key);
            element.parentNode.removeChild(element);
            console.log('delete:' + questions[key]);
            delete questions[key];
        }
    });
    Object.keys(msg).forEach(function (key) {
        var tablehtml = '';  // set each column in a new row of a table. looks better this way imo
        if (!questions[key]) {
            tablehtml = "<tr id='tr" + key + "'><td> \n\
                            <a class='innerLink' role='button' href='#' onclick='show(this)' id='" + key + "' data-active='false'><div style='width:100%'><h4>🠶 " + msg[key] + "</h4></div></a>\n\
                            <div style='display:none;' id='reply" + key + "'> \n\
                                <div id='editable' style='replyHolder'><textarea placeholder='Reply to the question...' style='width:100%' rows='3' onkeyup=submitReply(event) data-sid='" + key + "'></textarea></div>\n\
                                    <div id='replylist" + key + "'>\n\
                                    </div>\n\
                            </div> \n\
                        </td></tr>";
            questions[key] = msg[key];
            document.getElementById('questions').innerHTML += tablehtml;
            console.log('new question attached');
        }
    });
    setTimeout (function () {
        if(CURRENT_COORDS)
            positionUpdateSuccessCallback(CURRENT_COORDS);
    }, 3500); // 3.5 secs. still have to decide on a timer but 5 secs seems decent enough ?
});

var count = 0;
// called when page loads and then every 10 secs for update on client's position
function updatePosition() {
    console.log(++count + ': updatePosition');
    updatePositionHelper(positionUpdateSuccessCallback, function () {
        console.log('Cannot get location');
    });
}

// success callback for updatePositionHelper
function positionUpdateSuccessCallback(coords) {
    // emit client's coordinated to the server
    CURRENT_COORDS = coords;
    socket.emit('UpdatePosition', {coords: {'latitude': coords.latitude, 'longitude': coords.longitude}});
    console.log(count + ': positionupdatesuccesscallback');
}

// helper function for updatePosition because that sorry little ass cant do shit by itself
function updatePositionHelper(successCallback, errorCallback) {
    successCallback = successCallback || function () {
    };
    errorCallback = errorCallback || function () {
    };

    // Try HTML5-spec geolocation.
    var geolocation = navigator.geolocation;

    if (geolocation) {
        // We have a real geolocation service.
        try {
            function handleSuccess(position) {
                console.log(count + ': handle success success');
                successCallback(position.coords);  // YAAYYYYY!!
            }

            geolocation.watchPosition(handleSuccess, errorCallback, {
                enableHighAccuracy: true, // high accuracy because idk how but this fixes its problems with mobiles
                maximumAge: 0  // 0 sec. ask for new object everytime user moves.
            });
        } catch (err) {
            errorCallback();  // NOOOOOO ;_;
        }
    } else {
        errorCallback();  // NOOOOOO T_T
    }
}

function show(thead) {
    var str = "reply" + thead.id;
    var bool = thead.getAttribute("data-active");
    if (bool == "false") {
        socket.emit('requestReplyList', thead.id);
        document.getElementById(str).style = "display:initial;";
        thead.setAttribute("data-active", "true");
    }
    else {
        document.getElementById(str).style = "display:none;";
        thead.setAttribute("data-active", "false");
    }
}

socket.on('replyList', function (obj) {
    var html = "";
    console.log(obj.reply);
    for (var s in obj.reply) {
        html += "<div class='reply'>" + obj.reply[s] + "</div>";
    }
    document.getElementById('replylist' + obj.socketID).innerHTML = html;
});