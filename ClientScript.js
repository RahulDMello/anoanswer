/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

// init socket
var socket = io('http://localhost:8080');  // for localhost
// var socket = io('https://calm-crag-26465.herokuapp.com/');  for server deploy

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
// so we can set it as out current question in the navbar
socket.on('AttachNewQuestion', function (msg) {
    document.getElementById('currQues').innerHTML = " Current Question: " + msg;
});

// TODO refactor this event
// msg contains a list of questions and socketIDs of other clients within 2km radius
socket.on('AddNewQuestionToList', function (msg) {
    var tablehtml = '<table class="table table-hover"><tbody>';  // set each column in a new row of a table. looks better this way imo
    Object.keys(msg).forEach(function (key) {
        tablehtml += '<tr><td>🠶 ' + msg[key]+ '</td></tr>';
    });
    tablehtml += '</tbody></table>';
    document.getElementById('questions').innerHTML = tablehtml;
});


// called when page loads and then every 10 secs for update on client's position
function updatePosition() {
    updatePositionHelper(positionUpdateSuccessCallback, function () {
        console.log('Cannot get location');
    });
}

// success callback for updatePositionHelper
function positionUpdateSuccessCallback(coords) {
    // emit client's coordinated to the server
    socket.emit('UpdatePosition', {coords: {'latitude': coords.latitude, 'longitude': coords.longitude}});
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
                successCallback(position.coords);  // YAAYYYYY!!
            }

            geolocation.watchPosition(handleSuccess, errorCallback, {
                enableHighAccuracy: true,  // high accuracy because idk how but this fixes its problems with mobiles
                maximumAge: 5000  // 5 sec.
            });
        } catch (err) {
            errorCallback();  // NOOOOOO ;_;
        }
    } else {
        errorCallback();  // NOOOOOO T_T
    }
    setTimeout(updatePosition, 10000);  // 10 secs
}