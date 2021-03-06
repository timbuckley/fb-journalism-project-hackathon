'use strict';

const firebase = require('firebase');

function Firebase() {
  return {
    addLocation: addLocation,
    getContent: getContent,
    getUsers: getUsers,
    init: init,
    userOptIn: userOptIn
  }

  function init() {
    _authorize();
  }

  function userOptIn(userId, ts) {
    const postData = {
      coordinates: [],
      timestamp: ts
    };
    const updates = {};

    updates['/users/' + userId] = postData;
    return _post(updates);
  }

  function addLocation(userId, params) {
    const coordinates = {
      lat: params.coordinates.lat,
      long: params.coordinates.long
    }

    return firebase.database().ref('/users/' + userId).child('coordinates').push(coordinates);
  }

  function getUsers(params) {
    switch (params) {
      case 'byHood':
        return _get('/' + params.hood + '/users')

      default: //all
        return _get('/users')
    }
  }

  function getContent(params) {
    switch(params.contentType) {
      case 'breaking':
        break;

      case 'crime':
        break;

      case 'traffic':
        break;

      default: //all
        break;
    }
  }
}

module.exports = Firebase;

function _authorize() {
  var ENV_VAR = process.env;
  var config = {
    apiKey: 'AIzaSyCkaFlqg8b0Wu2BSyaJYsiKpWkoEBx1czc',
    authDomain: 'fb-journalism-hackathon.firebaseapp.com',
    databaseURL: 'https://fb-journalism-hackathon.firebaseio.com',
    storageBucket: 'fb-journalism-hackathon.appspot.com'
  };

  firebase.initializeApp(config);
}

// var topPostsRef = firebase.database().ref('/posts').orderByChild('starCount').limitToLast(5);
function _get(params) {
  return firebase.database().ref(params)
}


// var update = {};
// update['/posts/' + postId + '/lastNotificationTimestamp'] =
//     firebase.database.ServerValue.TIMESTAMP;
// update['/user-posts/' + uid + '/' + postId + '/lastNotificationTimestamp'] =
//     firebase.database.ServerValue.TIMESTAMP;
// firebase.database().ref().update(update);

function _post(updates) {
  return firebase.database().ref().update(updates);
}
