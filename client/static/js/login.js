let emailNicknameStatus = false
let loginPasswordStatus = false

function checkInfos() {
    if (emailNicknameStatus && loginPasswordStatus) {
        document.getElementById('loginBtn').disabled = false
    } else {
        document.getElementById('loginBtn').disabled = true
    }
}
document.getElementById('emailNickname').addEventListener('input', function () {
    if (usernameRegex.test(document.getElementById('emailNickname').value) || emailRegex.test(document.getElementById('emailNickname').value)) {
        emailNicknameStatus = true
        document.getElementById('emailNicknameError').classList.add('hidden')
    } else {
        emailNicknameStatus = false
        document.getElementById('emailNicknameError').classList.remove('hidden')
        document.getElementById('emailNicknameError').style.color = 'red'
    }
    checkInfos()
})

document.getElementById('loginPswd').addEventListener("input", function () {
    if (!passwordRegex.test(document.getElementById('loginPswd').value)) {
        loginPasswordStatus = false
        document.getElementById('loginPasswordError').classList.remove('hidden')
        document.getElementById('loginPasswordError').style.color = 'red'
    } else {
        loginPasswordStatus = true
        document.getElementById('loginPasswordError').classList.add('hidden')
    }
    checkInfos()
})

document.getElementById('loginBtn').addEventListener('click', function (event) {
    event.preventDefault()

    const loginUser = {
        UsernameOrEmail: document.getElementById('emailNickname').value,
        Password: document.getElementById('loginPswd').value
    }

    fetch('api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginUser)
    }).then(async response => await response.json())
        .then(result => {
            if (result.message === 'Username or Email not found !') {
                document.getElementById('falseUser').classList.remove('hidden')
                document.getElementById('falseUser').style.color = 'red'
            } else if (result.message === 'Password not correct!') {
                document.getElementById('falsePaswd').classList.remove('hidden')
                document.getElementById('falsePaswd').style.color = 'red'
            } else {
                document.getElementById('usernameDisplay').textContent = result.username + " " + "▼"
                showPage('home-page')
            }
        })
        .catch((error) => {
            console.error('error in the login :', error)
        })
});