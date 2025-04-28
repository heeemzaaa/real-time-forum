let select = document.getElementById('categories')
let options = select.options;
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


let categories = [];
for (let i = 0; i < options.length; i++) {
    if (!options[i].disabled) {
        categories.push(options[i].value);
    }
}

document.getElementById('addCategory').addEventListener('click', function (event) {
    event.preventDefault()
    newCategory = document.getElementById('custom').value
    let add = true
    for (let i = 0; i < categories.length; i++) {
        if (newCategory === categories[i]) {
            add = false
            break
        }
    }
    if (add) {
        categories.push(newCategory)
        document.getElementById('categoryError').classList.add('hidden')
        let option = document.createElement('option')
        option.value = newCategory
        option.textContent = newCategory
        select.appendChild(option)
    } else {
        document.getElementById('categoryError').classList.remove('hidden')
        document.getElementById('categoryError').style.color = 'red'
    }
})

select.addEventListener('change', function (event) {
    let selectedCategory = event.target.value;
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
        Title: document.getElementById('title').value,
        Category: document.getElementById('categories').value,
        Content: document.getElementById('content').value
    }

    fetch('api/newpost', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    }).then(async response => await response.json())
        .then(data => {
            console.log('data sent successfully:', data)
            showPage('home-page')
        }).catch((error) => {
            console.error('Error in the post:', error)
        })
    document.getElementById('title').value = ""
    document.getElementById('categories').value = ""
    document.getElementById('content').value = ""
    document.getElementById('custom').value = ""
})

function loadCategories() {
    fetch('/api/get-categories', {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(result => {
            console.log(result)
            select.innerHTML = '<option value="" disabled selected>Choose your category</option>'
            result.forEach(category => {
                categories.push(category.Category_name)
                let option = document.createElement('option')
                option.value = category.Category_name
                option.textContent = category.Category_name
                select.appendChild(option)
            })
        })
        .catch((error) => {
            console.log('Error:', error)
        })
}

