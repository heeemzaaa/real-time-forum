let select = document.getElementById('categories')
let newCategory = ""
let category = ""
let categoryStatus = false
let contentStatus = false

function validPost() {
    if (categoryStatus && contentStatus) {
        console.log(categoryStatus)
        console.log(contentStatus)
        document.getElementById('submit').disabled = false
    } else {
        console.log(categoryStatus)
        console.log(contentStatus)
        document.getElementById('submit').disabled = true
    }
}

document.getElementById('addCategory').addEventListener('click', function (event) {
    event.preventDefault()

    newCategory = document.getElementById('custom').value
    let option = document.createElement('option')
    option.value = newCategory
    option.textContent = newCategory
    select.appendChild(option)
})

select.addEventListener('select', function () {
    document.getElementById('categories').value
    categoryStatus = true
    validPost()
})

document.getElementById('content').addEventListener('input', function () {
    let content = document.getElementById('content').value
    let p = document.getElementById('contentError')
    if (content.length < 3 || content.length > 500) {
        p.classList.remove('hidden')
        p.style.color = 'red'
        contentStatus = false
    } else {
        p.classList.add('hidden')
        contentStatus = true
    }
    validPost()
})

document.getElementById('submit').addEventListener('click', function (event) {
    event.preventDefault()

    const postData = {
        title: document.getElementById('title').value,
        addCategory: document.getElementById('custom').value || "",
        category: document.getElementById('categories').value,
        content: document.getElementById('content').value
    }

    fetch('api/newPost', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    }).then(response => response.json()).then(data => {
        console.log('data sent successfully:', data)
        showPage('home-page')
    }).catch((error) => {
        console.error('Error in the post:', error)
    })
})
