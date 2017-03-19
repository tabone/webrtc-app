(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Object used to represent a user.
 * @type {Object}
 */

var user = require('./models/user');

/**
 * DOM Element containing the list of online users.
 * @type {HTML Element}
 */
var usersDOM = document.querySelector('.app-sidebar__content');

/**
 * DOM Element to display the local video stream.
 * @type {HTML Element}
 */
var localDOM = document.querySelector('.app-video__local');

/**
 * DOM Element to display the remote video stream.
 * @type {HTML Element}
 */
var remoteDOM = document.querySelector('.app-video__remote');

var app = {
  /**
   * Contains the list of online users indexed by their id.
   * @type {Object}
   */
  users: {},

  /**
   * Web Socket connection.
   * @type {Object}
   */
  socket: null,

  /**
   * User stream.
   * @type {Object}
   */
  stream: null,

  /**
   * WebRTC Peer Connection.
   * @type {Object}
   */
  rtcConn: null,

  /**
   * Function used to initialize the app.
   */
  init: function init() {
    var self = this;

    // Retrieve user's stream.
    return getUserMedia().then(function (stream) {
      localDOM.srcObject = stream;
      self.stream = stream;
      connect.call(self);
    }).catch(console.error);
  }
};

/**
 * Function used to get the user's media.
 * @return {Promise} Resolved once the requested user media is retrieved.
 *                   Rejected otherwise.
 */
function getUserMedia() {
  return new Promise(function (resolve, reject) {
    navigator.getUserMedia({ video: true }, resolve, reject);
  });
}

/**
 * Function used to connect with the WebSocket server.
 */
function connect() {
  var _this = this;

  this.socket = new WebSocket('ws://localhost:8081');
  this.socket.onmessage = function (message) {
    var payload = JSON.parse(message.data);

    switch (payload.type) {
      // New user is online.
      case 'user-online':
        return addUser.call(_this, payload.data);
      // A user got offline.
      case 'user-offline':
        return removeUser.call(_this, payload.data);
      // List of current online users (only recieved on connection).
      case 'users':
        return addUsers.call(_this, payload.data);
      // RTC ICE Candidate message.
      case 'ice':
        return onIce.call(_this, payload.data);
      // RTC Offer message.
      case 'offer':
        return onOffer.call(_this, payload.data);
      // RTC Answer message.
      case 'answer':
        return onAnswer.call(_this, payload.data);
    }
  };
}

/**
 * Function used to add a user.
 * @param {Object} data User to be added.
 */
function addUser(data) {
  // Create new user with data retrieved from backend.
  var newUser = Object.create(user);
  newUser.init({
    id: data.id,
    name: data.name,
    actions: {
      doCall: doCall.bind(this)
    }
  });

  // Include user in the online users list.
  this.users[newUser.id] = newUser;

  // Include user DOM.
  usersDOM.appendChild(newUser.element);
}

/**
 * Function used to remove a user.
 * @return {Object} User to be removed.
 */
function removeUser(data) {
  // Retrieve user from the online user's list
  var user = this.users[data.id];

  // Remove DOM element representing the user.
  usersDOM.removeChild(user.element);

  // Remove user from the online users list.
  delete this.users[data.id];
}

/**
 * Function used to add an array of users.
 * @param {Array} data List of users to be added.
 */
function addUsers(data) {
  var _this2 = this;

  var self = this;
  data.forEach(function (user) {
    return addUser.call(_this2, user);
  });
}

/**
 * Function invoked when recieving the ICE Candidate info of the remote user.
 * @param  {Object} data.ice  ICE Candidate info.
 * @param  {Object} data.user User who sent the ICE Candidate info.
 */
function onIce(data) {
  if (data.ice === null) return;
  // Add ICE Candidate.
  this.rtcConn.addIceCandidate(new RTCIceCandidate(data.ice));
}

/**
 * Function invoked when recieving an Offer by another user.
 * @param  {Object} data.description User's RTC Session Description.
 * @param  {Object} data.user        User making the offer.
 */
function onOffer(data) {
  var self = this;

  // Create RTC Peer Connection.
  var rtcConn = this.rtcConn = new RTCPeerConnection();

  // Set remote description.
  rtcConn.setRemoteDescription(new RTCSessionDescription(data.description));

  // Add stream.
  rtcConn.addStream(this.stream);

  // When the remote stream is available, add it to the remote video Element.
  rtcConn.onaddstream = function (ev) {
    return remoteDOM.srcObject = ev.stream;
  };

  // Listen for new ICE Candidates and when retrieved send them to the calling
  // user.
  rtcConn.onicecandidate = function (ice) {
    self.socket.send(JSON.stringify({
      type: 'ice',
      data: {
        ice: ice.candidate,
        user: data.user.id
      }
    }));
  };

  // Create an answer and send the RTC Session Description to the calling user.
  rtcConn.createAnswer().then(function (description) {
    // Set description to be sent as the local RTC Session Description.
    rtcConn.setLocalDescription(description);

    // Send RTC Session Description to calling user.
    self.socket.send(JSON.stringify({
      type: 'answer',
      data: {
        description: description,
        user: data.user.id
      }
    }));
  }).catch(console.error);
}

/**
 * Function invoked when recieving an Answer by another user.
 * @param  {Object} data.description User's RTC Session Description.
 * @param  {Object} data.user        User making the answer.
 */
function onAnswer(data) {
  // Set the Remote Description of the user being called.
  this.rtcConn.setRemoteDescription(new RTCSessionDescription(data.description));
}

/**
 * Function used to make a call to a user. This method is invoked when the user
 * clicks on a Call button of one of the online user.
 * @this.  {Object} app instance.
 * @param  {Object} user The user to call.
 */
function doCall(user) {
  var self = this;

  // Create RTC Peer Connection.
  var rtcConn = this.rtcConn = new RTCPeerConnection();

  // Add stream to RTC Peer Connection.
  rtcConn.addStream(this.stream);

  // When the remote stream is available, add it to the remote video Element.
  rtcConn.onaddstream = function (ev) {
    return remoteDOM.srcObject = ev.stream;
  };

  // Listen for new ICE Candidates and when retrieved send them to the user
  // being called.
  rtcConn.onicecandidate = function (ice) {
    self.socket.send(JSON.stringify({
      type: 'ice',
      data: {
        ice: ice.candidate,
        user: user.id
      }
    }));
  };

  // Create an offer and send the RTC Session Description to the user being
  // called.
  rtcConn.createOffer().then(function (description) {
    // Set description to be sent as the local RTC Session Description.
    rtcConn.setLocalDescription(description);

    // Send the RTC Session Description to the user being called.
    self.socket.send(JSON.stringify({
      type: 'offer',
      data: {
        description: description,
        user: user.id
      }
    }));
  }).catch(console.error);
}

app.init();

},{"./models/user":2}],2:[function(require,module,exports){
'use strict';

module.exports = {
  /**
   * User's id.
   * @type {Number}
   */
  id: null,

  /**
   * User's name.
   * @type {String}
   */
  name: null,

  /**
   * HTML Element representing the user.
   * @type {HTML Element}
   */
  element: null,

  /**
   * Function used to initialize a user.
   * @param  {String}   options.id             User's id.
   * @param  {String}   options.name           User's name.
   * @param  {Function} options.actions.doCall Listener to be invoked when user
   *                                           clicks on the Call action button.
   */
  init: function init(_ref) {
    var id = _ref.id,
        name = _ref.name,
        actions = _ref.actions;

    this.id = id;
    this.name = name;
    this.element = createElement.call(this, name, actions);
  }
};

/**
 * Function used to create the HTML Element which a user will be represented by.
 * @param  {String} name User's name.
 * @param  {Function} options.actions.doCall Listener to be invoked when user
 *                                           clicks on the Call action button.
 * @return {HTML Element} HTML Element representing the user.
 */
function createElement(name, actions) {
  var _this = this;

  // Create DOM Elements
  var user = document.createElement('div');
  var userName = document.createElement('span');
  var userActions = document.createElement('div');
  var userCallAction = document.createElement('button');

  // Include class names.
  user.className = 'app-user';
  userName.className = 'app-user__name';
  userActions.className = 'app-user__actions';
  userCallAction.className = 'app-user__actions-call';

  // Include content.
  userName.innerHTML = name;
  userCallAction.innerHTML = 'Call';

  // Add listeners to actions.
  userCallAction.addEventListener('click', function () {
    return actions.doCall(_this);
  });

  // Append DOM Elements.
  userActions.appendChild(userCallAction);
  user.appendChild(userName);
  user.appendChild(userActions);

  // Return root element.
  return user;
}

},{}]},{},[1]);
