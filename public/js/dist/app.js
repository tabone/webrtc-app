(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var user = require('./models/user');
var usersDOM = document.querySelector('.app-sidebar__content');

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
   * Function used to initialize the app.
   */
  init: function init() {
    connect.call(this);
  }
};

/**
 * Function used to connect with the WebSocket server.
 */
function connect() {
  var _this = this;

  this.socket = new WebSocket('ws://localhost:8081');
  this.socket.onmessage = function (message) {
    var payload = JSON.parse(message.data);
    switch (payload.type) {
      case 'user-online':
        return addUser.call(_this, payload.data);
      case 'user-offline':
        return removeUser.call(_this, payload.data);
      case 'users':
        return addUsers.call(_this, payload.data);
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
  newUser.init(data.id, data.name);

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
   * @param  {String} id   User's id.
   * @param  {String} name User's name.
   */
  init: function init(id, name) {
    this.id = id;
    this.name = name;
    this.element = createElement(name);
  }
};

/**
 * Function used to create the HTML Element which a user will be represented by.
 * @param  {String} name User's name
 * @return {HTML Element} HTML Element representing the user.
 */
function createElement(name) {
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

  // Include content
  userName.innerHTML = name;
  userCallAction.innerHTML = 'Call';

  // Append DOM Elements.
  userActions.appendChild(userCallAction);
  user.appendChild(userName);
  user.appendChild(userActions);

  // Return root element.
  return user;
}

},{}]},{},[1]);
