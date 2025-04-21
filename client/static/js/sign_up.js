let username = ""
let email = ""
let age = 0
let gender = ""
let firstName = ""
let lastName = ""
let password = ""

const usernameRegex = /^[a-zA-Z0-9_-]{3,16}$/
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const ageRegex = /^(1[0-1][0-9]|120|[1-9][0-9]|[1-9])$/
const genderRegex = /^(male|female|other)$/i
const firstNameRegex = /^[a-zA-Z\s-]{2,30}$/
const lastNameRegex = /^[a-zA-Z\s-]{2,30}$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

let userStatus = false
let emailStatus = false
let ageStatus = false
let genderStatus = false
let firstNameStatus = false
let lastNameStatus = false
let passwordStatus = false

function checkValidation() {
  if (userStatus && emailStatus && ageStatus && genderStatus && firstNameStatus && lastNameStatus && passwordStatus) {
    document.getElementById('signupBtn').disabled = false
  } else {
    document.getElementById('signupBtn').disabled = true
  }
}

document.getElementById('username').addEventListener("input", function () {
  if (!usernameRegex.test(document.getElementById('username').value)) {
    userStatus = false
    document.getElementById('nicknameError').classList.remove('hidden')
    document.getElementById('nicknameError').style.color = 'red'
  } else {
    userStatus = true
    document.getElementById('nicknameError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('email').addEventListener("input", function () {
  if (!emailRegex.test(document.getElementById('email').value)) {
    emailStatus = false
    document.getElementById('emailError').classList.remove('hidden')
    document.getElementById('emailError').style.color = 'red'
  } else {
    emailStatus = true
    document.getElementById('emailError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('age').addEventListener("input", function () {
  if (!ageRegex.test(document.getElementById('age').value)) {
    ageStatus = false
    document.getElementById('ageError').classList.remove('hidden')
    document.getElementById('ageError').style.color = 'red'
  } else {
    ageStatus = true
    document.getElementById('ageError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('gender').addEventListener("input", function () {
  if (!genderRegex.test(document.getElementById('gender').value)) {
    genderStatus = false
    document.getElementById('genderError').classList.remove('hidden')
    document.getElementById('genderError').style.color = 'red'
  } else {
    genderStatus = true
    document.getElementById('genderError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('firstName').addEventListener("input", function () {
  if (!firstNameRegex.test(document.getElementById('firstName').value)) {
    firstNameStatus = false
    document.getElementById('firstNameError').classList.remove('hidden')
    document.getElementById('firstNameError').style.color = 'red'
  } else {
    firstNameStatus = true
    document.getElementById('firstNameError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('lastName').addEventListener("input", function () {
  if (!lastNameRegex.test(document.getElementById('lastName').value)) {
    lastNameStatus = false
    document.getElementById('lastNameError').classList.remove('hidden')
    document.getElementById('lastNameError').style.color = 'red'
  } else {
    lastNameStatus = true
    document.getElementById('lastNameError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('pswd').addEventListener("input", function () {
  if (!passwordRegex.test(document.getElementById('pswd').value)) {
    passwordStatus = false
    document.getElementById('passwordError').classList.remove('hidden')
    document.getElementById('passwordError').style.color = 'red'
  } else {
    passwordStatus = true
    document.getElementById('passwordError').classList.add('hidden')
  }
  checkValidation()
})

document.getElementById('signupBtn').addEventListener('click', function (event) {
  event.preventDefault()

  const user = {
    Username: document.getElementById('username').value,
    Email: document.getElementById('email').value,
    Age: parseInt(document.getElementById('age').value),
    Gender: document.getElementById('gender').value,
    FirstName: document.getElementById('firstName').value,
    LastName: document.getElementById('lastName').value,
    PasswordHash: document.getElementById('pswd').value
  }


  fetch('api/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  })
    .then(async response => await response.json())
    .then(result => {
      console.log("data sent successfully:", result)
      showPage('home-page')
    })
    .catch((error) => {
      console.error('error in the sign up:', error)
    })


  showPage('home-page')
})