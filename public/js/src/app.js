'use strict'

const user = require('./models/user')
const usersDOM = document.querySelector('.app-sidebar__content')

const app = {
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
  init () {
    connect.call(this)
  }
}

/**
 * Function used to connect with the WebSocket server.
 */
function connect () {
  this.socket = new WebSocket('ws://localhost:8081')
  this.socket.onmessage = (message) => {
    const payload = JSON.parse(message.data)
    switch (payload.type) {
      case 'user-online': return addUser.call(this, payload.data)
      case 'user-offline': return removeUser.call(this, payload.data)
      case 'users': return addUsers.call(this, payload.data)
    } 
  }
}

/**
 * Function used to add a user.
 * @param {Object} data User to be added.
 */
function addUser (data) {
  // Create new user with data retrieved from backend.
  const newUser = Object.create(user)
  newUser.init(data.id, data.name)

  // Include user in the online users list.
  this.users[newUser.id] = newUser

  // Include user DOM.
  usersDOM.appendChild(newUser.element)
}

/**
 * Function used to remove a user.
 * @return {Object} User to be removed.
 */
function removeUser (data) {
  // Retrieve user from the online user's list
  const user = this.users[data.id]

  // Remove DOM element representing the user.
  usersDOM.removeChild(user.element)

  // Remove user from the online users list.
  delete this.users[data.id]
}

/**
 * Function used to add an array of users.
 * @param {Array} data List of users to be added.
 */
function addUsers (data) {
  const self = this
  data.forEach(user => addUser.call(this, user))
}

app.init()
