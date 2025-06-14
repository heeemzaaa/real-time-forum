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
}