document.getElementById('logout').addEventListener('click' , function() {
    fetch('/api/logout' , {
        credentials: 'include'
    }).then(response => response.json())
    .then(result => {
        showPage('register-login-page')
    }).catch((error) => {
        console.log(error)
    })
})