'use strict'

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
  init ({ id, name, actions }) {
    this.id = id
    this.name = name
    this.element = createElement.call(this, name, actions)
  }
}

/**
 * Function used to create the HTML Element which a user will be represented by.
 * @param  {String} name User's name.
 * @param  {Function} options.actions.doCall Listener to be invoked when user
 *                                           clicks on the Call action button.
 * @return {HTML Element} HTML Element representing the user.
 */
function createElement (name, actions) {
  // Create DOM Elements
  const user = document.createElement('div')
  const userName = document.createElement('span')
  const userActions = document.createElement('div')
  const userCallAction = document.createElement('button')

  // Include class names.
  user.className = 'app-user'
  userName.className = 'app-user__name'
  userActions.className = 'app-user__actions'
  userCallAction.className = 'app-user__actions-call'

  // Include content.
  userName.innerHTML = name
  userCallAction.innerHTML = 'Call'

  // Add listeners to actions.
  userCallAction.addEventListener('click', () => actions.doCall(this))

  // Append DOM Elements.
  userActions.appendChild(userCallAction)
  user.appendChild(userName)
  user.appendChild(userActions)

  // Return root element.
  return user
}