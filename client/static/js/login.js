let emailNicknameStatus = false;
let loginPasswordStatus = false;
const loginBtn = document.getElementById('loginBtn');
const emailNicknameInput = document.getElementById('emailNickname');
const loginPswdInput = document.getElementById('loginPswd');
const emailNicknameError = document.getElementById('emailNicknameError');
const loginPasswordError = document.getElementById('loginPasswordError');
const falseUserError = document.getElementById('falseUser');
const falsePaswdError = document.getElementById('falsePaswd');
const usernameDisplay = document.getElementById('usernameDisplay');


// Checks the validation status of all login form fields
// and enables/disables the login button accordingly
function checkInfos() {
    loginBtn.disabled = !(emailNicknameStatus && loginPasswordStatus);
}

// Validates email/username input field
function validateEmailNickname() {
    const value = emailNicknameInput.value;

    if (usernameRegex.test(value) || emailRegex.test(value)) {
        emailNicknameStatus = true;
        emailNicknameError.classList.add('hidden');
    } else {
        emailNicknameStatus = false;
        emailNicknameError.classList.remove('hidden');
        emailNicknameError.style.color = 'red';
    }

    checkInfos();
}


// Validates password input field
function validatePassword() {
    const value = loginPswdInput.value;

    if (passwordRegex.test(value)) {
        loginPasswordStatus = true;
        loginPasswordError.classList.add('hidden');
    } else {
        loginPasswordStatus = false;
        loginPasswordError.classList.remove('hidden');
        loginPasswordError.style.color = 'red';
    }
    checkInfos();
}


// Handles the login form submission
function handleLogin(event) {
    event.preventDefault();

    const loginUser = {
        UsernameOrEmail: emailNicknameInput.value,
        Password: loginPswdInput.value
    };

    fetch('api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginUser)
    })
        .then(response => response.json())
        .then(result => {
            // Reset error messages
            falseUserError.classList.add('hidden');
            falsePaswdError.classList.add('hidden');

            // Handle different response cases
            if (result.message === 'Username or Email not found !') {
                falseUserError.classList.remove('hidden');
                falseUserError.style.color = 'red';
            } else if (result.message === 'Password not correct!') {
                falsePaswdError.classList.remove('hidden');
                falsePaswdError.style.color = 'red';
            } else {
                usernameDisplay.textContent = result.username;
                showPage('home-page');
            }
        })
        .catch(error => {
            console.error('Error in the login:', error);
        });
}

// Add event listeners
emailNicknameInput.addEventListener('input', validateEmailNickname);
loginPswdInput.addEventListener('input', validatePassword);
loginBtn.addEventListener('click', handleLogin);