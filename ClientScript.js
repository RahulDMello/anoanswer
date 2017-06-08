/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var socket = io('http://localhost:8080');  // for localhost
// var socket = io('https://calm-crag-26465.herokuapp.com/');  for server deploy

function isEnterKey(event) {
    var check = validate();
    if (event.keyCode === 13) {
        if (check) {
            document.getElementById("boxInput").class = "form-group";
            updateQuestion();
        } else {
            document.getElementById("boxInput").class = "form-group has-error";
        }
    }
}


function validate() {
    var str = document.getElementById("txtInput").value;
    document.getElementById("submit").disabled = (str === "" || str == null);
    return !(str === "");
}

function updateQuestion() {
    socket.emit('RecieveNewQuestion', document.getElementById('txtInput').value);
    document.getElementById('txtInput').value = "";
    validate();
}

socket.on('AttachNewQuestion', function (msg) {
    document.getElementById('currQues').innerHTML = " Current Question: " + msg;
});

socket.on('AddNewQuestionToList', function (msg) {
    document.getElementById('questions').innerHTML = '';
    Object.keys(msg).forEach(function (key) {
        document.getElementById('questions').innerHTML += '<br/>' + msg[key];
    });
    console.log(msg);
});

function updatePosition() {
    updatePositionHelper(positionUpdateSuccessCallback, function () {
        console.log('Cannot get location');
    });
}

function positionUpdateSuccessCallback(coords) {
    socket.emit('UpdatePosition', {coords: {'latitude': coords.latitude, 'longitude': coords.longitude}});
    console.log({coords: {'latitude': coords.latitude, 'longitude': coords.longitude}});
}

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
                successCallback(position.coords);
            }

            geolocation.watchPosition(handleSuccess, errorCallback, {
                enableHighAccuracy: true,
                maximumAge: 5000 // 5 sec.
            });
        } catch (err) {
            errorCallback();
        }
    } else {
        errorCallback();
    }
    setTimeout(updatePosition, 10000); // 10 secs
}