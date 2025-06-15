// this function handles the error page error
function errorPage(status, message) {
    const ErrorPage = document.getElementById('ErrorPage')
    ErrorPage.innerHTML = ''

    let errorHeader = document.createElement('h1')
    errorHeader.id = 'errorHeader'
    errorHeader.innerHTML = `Error ${status}`

    ErrorPage.appendChild(errorHeader)

    let errorText = document.createElement('h3')
    errorText.id = 'errorText'
    errorText.innerHTML = message

    ErrorPage.appendChild(errorText)

    let backButton = document.createElement('button')
    backButton.id = 'backButton'
    backButton.textContent = 'Go Back'
    backButton.addEventListener('click', () => showPage('home-page'))

    ErrorPage.appendChild(backButton)
}