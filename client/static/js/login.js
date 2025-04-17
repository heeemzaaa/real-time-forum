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
        usernameOrEmail: document.getElementById('emailNickname').value,
        password: document.getElementById('loginPswd').value
    }

    fetch('api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginUser)
    }).then(response => response.json())
        .then(data => {
            console.log('data sent successfully:', data)
            showPage('home-page')
        })
        .catch((error) => {
            console.error('error in the login :', error)
        })
    showPage('home-page')
});