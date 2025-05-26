const usernameDisplay = document.getElementById('usernameDisplay');

// Data
const signup = {
    username: {
        rgx: /^[a-zA-Z0-9_-]{3,16}$/,
        input: document.getElementById('username'),
        error: document.getElementById('nicknameError'),
        status: false
    },
    email: {
        rgx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        input: document.getElementById('email'),
        error: document.getElementById('emailError'),
        status: false
    },
    age: {
        rgx: /^(1[0-1][0-9]|120|[1-9][0-9]|[1-9])$/,
        input: document.getElementById('age'),
        error: document.getElementById('ageError'),
        status: false
    },
    gender: {
        rgx: /^(male|female|other)$/i,
        input: document.getElementById('gender'),
        error: document.getElementById('genderError'),
        status: false
    },
    firstname: {
        rgx: /^[a-zA-Z\s-]{2,30}$/,
        input: document.getElementById('firstName'),
        error: document.getElementById('firstNameError'),
        status: false
    },
    lastname: {
        rgx: /^[a-zA-Z\s-]{2,30}$/,
        input: document.getElementById('lastName'),
        error: document.getElementById('lastNameError'),
        status: false
    },
    password: {
        rgx: /^[a-zA-Z0-9!@#$%^&*]{8,10}$/,
        input: document.getElementById('pswd'),
        error: document.getElementById('passwordError'),
        status: false
    },
    check: () => {
        (signup.username.status && signup.email.status && signup.age.status && signup.gender.status && signup.firstname.status && signup.lastname.status && signup.password.status)?
        signup.button.disabled = false
        :
        signup.button.disabled = true
    },

    alreadyUsed: document.getElementById('alreadyUsed'),
    fillAll: document.getElementById('fillAll'),
    button: document.getElementById('signupBtn')
}

const login = {
    emailusername: {
        rgx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        rgx2: /^[a-zA-Z0-9_-]{3,16}$/,
        input: document.getElementById('emailNickname'),
        error: document.getElementById('emailNicknameError'),
        status: false
    },
    password: {
        rgx: /^[a-zA-Z0-9!@#$%^&*]{8,10}$/,
        input: document.getElementById('loginPswd'),
        error: document.getElementById('loginPasswordError'),
        status: false
    },

    falseUser: document.getElementById('falseUser'),
    falsePaswd: document.getElementById('falsePaswd'),
    button: document.getElementById('loginBtn'),

    check: () => {
        (login.emailusername.status && login.password.status)?
        login.button.disabled = false
        :
        login.button.disabled = true;
    },
}

// Listeners
signup.username.input.addEventListener("input", () => test(signup.username, signup));
signup.email.input.addEventListener("input", () => test(signup.email, signup));
signup.age.input.addEventListener("input", () => test(signup.age, signup));
signup.gender.input.addEventListener("input", () => test(signup.gender, signup));
signup.firstname.input.addEventListener("input", () => test(signup.firstname, signup));
signup.lastname.input.addEventListener("input", () => test(signup.lastname, signup));
signup.password.input.addEventListener("input", () => test(signup.password, signup));
signup.button.addEventListener('click', (event) => {
    event.preventDefault()

    const user = {
        Username: signup.username.input.value,
        Email: signup.email.input.value,
        Age: parseInt(signup.age.input.value),
        Gender: signup.gender.input.value,
        FirstName: signup.firstname.input.value,
        LastName: signup.lastname.input.value,
        PasswordHash: signup.password.input.value
    }

    fetch('api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    })
    .then(response => response.json())
    .then(data => {

        if (data.message == 'Email or username already used!') {
            Toast('Email or username already used!')
        } else if (data.message == 'Please fill in all required fields') {
            Toast('Please fill in all required fields')
        } else if (data.message == 'User created') {
            usernameDisplay.textContent = user.Username; 
            Toast('Welcome to our forum ✅')
            showPage('home-page');
        } else {
            Toast("Error in the server, please try again later 😊")
        }
    })
    .catch((error) => {
        Toast("Error in the server, please try again later 😊")
        console.error('error in sign up:', error)
    })
});

login.emailusername.input.addEventListener('input', () => test(login.emailusername, login));
login.password.input.addEventListener("input", () => test(login.password, login));
login.button.addEventListener('click', (event) => {
    event.preventDefault()

    const user = {
        UsernameOrEmail: login.emailusername.input.value,
        Password: login.password.input.value
    }

    fetch('api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Username or Email not found !') {
            Toast('Username or Email not found ❌')
        } else if (data.message === 'Password not correct!') {
            Toast('Password not correct ❌')
        } else if (data.message === "Error in the server, please try again !") {
            Toast("Error in the server, please try again later 😊")
        } else {
            usernameDisplay.textContent = data.username; 
            showPage('home-page')
            Toast('Welcome back ✅')
        }
    })
    .catch((error) => {
        Toast("Error in the server, please try again later 😊")
        console.error('error in login :', error)
    })
});

document.getElementById('logout').addEventListener('click' , () => {
    fetch('/api/logout' , {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Failed to delete the session Id from the database!") {
            Toast("Error in the server, please try again later 😊")
        } else if (data.message === "Session deleted successfully!") {
            showPage('register-login-page')
            Toast("See you soon 👋🏼")
        }
    })
    .catch((error) => {
        Toast("Error in the server, please try again later 😊")
        console.log('error in logout :',error)
    })
})

// utils
function test(obj, method) {
    // debounce
    if (obj.rgx.test(obj.input.value) || obj.rgx2?.test(obj.input.value)) {
        obj.status = true
        obj.error.classList.add('hidden')
    } else {
        obj.status = false
        obj.error.classList.remove('hidden')
        obj.error.style.color = 'red'
    }
    method.check();
}