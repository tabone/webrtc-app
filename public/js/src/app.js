'use strict'

/**
 * Object used to represent a user.
 * @type {Object}
 */
const user = require('./models/user')

/**
 * DOM Element containing the list of online users.
 * @type {HTML Element}
 */
const usersDOM = document.querySelector('.app-sidebar__content')

/**
 * DOM Element to display the local video stream.
 * @type {HTML Element}
 */
const localDOM = document.querySelector('.app-video__local')

/**
 * DOM Element to display the remote video stream.
 * @type {HTML Element}
 */
const remoteDOM = document.querySelector('.app-video__remote')

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
  init () {
    const self = this

    // Retrieve user's stream.
    return getUserMedia().then(stream => {
      localDOM.srcObject = stream
      self.stream = stream
      connect.call(self)
    }).catch(console.error)
  }
}

/**
 * Function used to get the user's media.
 * @return {Promise} Resolved once the requested user media is retrieved.
 *                   Rejected otherwise.
 */
function getUserMedia () {
  return new Promise ((resolve, reject) => {
    navigator.getUserMedia({ video: true }, resolve, reject)
  })
}

/**
 * Function used to connect with the WebSocket server.
 */
function connect () {
  this.socket = new WebSocket('ws://localhost:8081')
  this.socket.onmessage = (message) => {
    const payload = JSON.parse(message.data)

    switch (payload.type) {
      // New user is online.
      case 'user-online': return addUser.call(this, payload.data)
      // A user got offline.
      case 'user-offline': return removeUser.call(this, payload.data)
      // List of current online users (only recieved on connection).
      case 'users': return addUsers.call(this, payload.data)
      // RTC ICE Candidate message.
      case 'ice': return onIce.call(this, payload.data)
      // RTC Offer message.
      case 'offer': return onOffer.call(this, payload.data)
      // RTC Answer message.
      case 'answer': return onAnswer.call(this, payload.data)
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
  newUser.init({
    id: data.id,
    name: data.name,
    actions: {
      doCall: doCall.bind(this)
    }
  })

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

/**
 * Function invoked when recieving the ICE Candidate info of the remote user.
 * @param  {Object} data.ice  ICE Candidate info.
 * @param  {Object} data.user User who sent the ICE Candidate info.
 */
function onIce (data) {
  if (data.ice === null) return
  // Add ICE Candidate.
  this.rtcConn.addIceCandidate(new RTCIceCandidate(data.ice))
}

/**
 * Function invoked when recieving an Offer by another user.
 * @param  {Object} data.description User's RTC Session Description.
 * @param  {Object} data.user        User making the offer.
 */
function onOffer (data) {
  const self = this

  // Create RTC Peer Connection.
  const rtcConn = this.rtcConn = new RTCPeerConnection()

  // Set remote description.
  rtcConn.setRemoteDescription(new RTCSessionDescription(data.description))

  // Add stream.
  rtcConn.addStream(this.stream)

  // When the remote stream is available, add it to the remote video Element.
  rtcConn.onaddstream = (ev) => remoteDOM.srcObject = ev.stream

  // Listen for new ICE Candidates and when retrieved send them to the calling
  // user.
  rtcConn.onicecandidate = (ice) => {
    self.socket.send(JSON.stringify({
      type: 'ice',
      data: {
        ice: ice.candidate,
        user: data.user.id
      }
    }))
  }

  // Create an answer and send the RTC Session Description to the calling user.
  rtcConn.createAnswer().then(description => {
    // Set description to be sent as the local RTC Session Description.
    rtcConn.setLocalDescription(description)

    // Send RTC Session Description to calling user.
    self.socket.send(JSON.stringify({
      type: 'answer',
      data: {
        description,
        user: data.user.id
      }
    }))
  }).catch(console.error)
}

/**
 * Function invoked when recieving an Answer by another user.
 * @param  {Object} data.description User's RTC Session Description.
 * @param  {Object} data.user        User making the answer.
 */
function onAnswer (data) {
  // Set the Remote Description of the user being called.
  this.rtcConn.setRemoteDescription(new RTCSessionDescription(data.description))
}

/**
 * Function used to make a call to a user. This method is invoked when the user
 * clicks on a Call button of one of the online user.
 * @this.  {Object} app instance.
 * @param  {Object} user The user to call.
 */
function doCall (user) {
  const self = this

  // Create RTC Peer Connection.
  const rtcConn = this.rtcConn = new RTCPeerConnection()

  // Add stream to RTC Peer Connection.
  rtcConn.addStream(this.stream)

  // When the remote stream is available, add it to the remote video Element.
  rtcConn.onaddstream = (ev) => remoteDOM.srcObject = ev.stream

  // Listen for new ICE Candidates and when retrieved send them to the user
  // being called.
  rtcConn.onicecandidate = (ice) => {
    self.socket.send(JSON.stringify({
      type: 'ice',
      data: {
        ice: ice.candidate,
        user: user.id
      }
    }))
  }

  // Create an offer and send the RTC Session Description to the user being
  // called.
  rtcConn.createOffer().then(description => {
    // Set description to be sent as the local RTC Session Description.
    rtcConn.setLocalDescription(description)

    // Send the RTC Session Description to the user being called.
    self.socket.send(JSON.stringify({
      type: 'offer',
      data: {
        description,
        user: user.id
      }
    }))
  }).catch(console.error)
}

app.init()
