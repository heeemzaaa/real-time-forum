const select = document.getElementById('categories')
const addCategory = document.getElementById('addCategory')
const custom = document.getElementById('custom')
const title = document.getElementById('title')
const content = document.getElementById('content')
const submit = document.getElementById('submit')
const choosenCategories = document.getElementById('choosenCategories')
const categoryError = document.getElementById('categoryError')

let newCategory = ""
let category = ""
let categoryStatus = false
let contentStatus = false
let titleStatus = false
let categories = []
let categoriesSlice = []



// this function handles the logic of loading categories
function loadCategories() {
    fetch('/api/get-categories', {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status && data.message) {
                errorPage(data.status, data.message)
                showPage('ErrorPage')
                return
            }

            if (!Array.isArray(data)) {
                errorPage(500, "Unexpected response format while loading categories.")
                showPage('ErrorPage')
                return
            }
            selectCategories.innerHTML = '<option value="" selected disabled style="color: gray;">Choose category or more</option>'
            data.forEach(category => {
                categoriesSlice.push(category)
                const option = document.createElement('option')
                option.value = category.Category_name
                option.textContent = category.Category_name
                selectCategories.appendChild(option)
            })
        })
        .catch(error => {
            console.error("Failed to load categories", error)
            errorPage(500, "Failed to connect to the server. Please try again later.")
            showPage('ErrorPage')
        })
}

// this function empties the value of the posts inputs if out
function emptyInputs() {
    title.value = ""
    categories = []
    content.value = ""
    custom.value = ""
    choosenCategories.innerHTML = ''
}

// this function handles the logic if all the inputs are valid to proceed to add the post
function validPost() {
    if (categoryStatus && contentStatus && titleStatus) {
        document.getElementById('submit').disabled = false
    } else {
        document.getElementById('submit').disabled = true
    }
}


// event listener on the title
title.addEventListener('input', function () {
    if (document.getElementById('title').value === '') {
        titleStatus = false
    } else {
        titleStatus = true
    }
    validPost()
})

// event listener on adding categories
addCategory.addEventListener('click', function (event) {
    event.preventDefault()
    newCategory = custom.value

    for (let i = 0; i < categoriesSlice.length; i++) {
        if (newCategory === categoriesSlice[i].Category_name) {
            categoryError.classList.remove('hidden')
            categoryError.style.color = 'red'
            return
        }
    }

    categoriesSlice.push(newCategory)
    categoryError.classList.add('hidden')
    let option = document.createElement('option')
    option.value = newCategory
    option.textContent = newCategory
    selectCategories.appendChild(option)
})

// event listener on selecting categories
select.addEventListener('change', function (event) {
    let selectedCategory = event.target.value;

    if (categories.includes(selectedCategory)) return;

    categories.push(selectedCategory)
    console.log(categories)
    categoryStatus = true
    validPost()

    const categoryChosen = document.createElement('div')
    categoryChosen.style.borderRadius = '25px'
    categoryChosen.style.backgroundColor = '#095aa5'
    categoryChosen.style.padding = '10px'
    categoryChosen.style.color = 'white'
    categoryChosen.style.margin = '5px'
    categoryChosen.textContent = selectedCategory

    choosenCategories.appendChild(categoryChosen)
})


// event listener on the content
content.addEventListener('input', function () {
    let p = document.getElementById('contentError')
    if (content.value.length < 3 || content.value.length > 500) {
        p.classList.remove('hidden')
        p.style.color = 'red'
        contentStatus = false
    } else {
        p.classList.add('hidden')
        contentStatus = true
    }
    validPost()
})

// event listener on the submit button
submit.addEventListener('click', function (event) {
    event.preventDefault()
    addPost()
    emptyInputs()
})


// this function handles the logic of adding a new post
function addPost() {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(postData)
    }

    const postData = {
        title: title.value,
        categories: categories,
        content: content.value
    }

    fetch('/api/newpost', options)
    .then(res => res.json())
    .then(data => {
        if (data.status === 200 && data.message === "Post created !") {
            Toast("Post published successfully ✅")
            showPage('home-page')
        } 
        else if (data.status === 400) {
            Toast(data.message || "Invalid data sent. Please check your input.")
        } 
        else if (data.status === 401) {
            showPage('register-login-page')
            Toast("You have to login to add a post !")
        } 
        else if (data.status === 405) {
            errorPage(data.status, "Method not allowed.")
            showPage('ErrorPage')
        } 
        else if (data.status === 500) {
            errorPage(data.status, data.message || "Something went wrong while creating the post.")
            showPage('ErrorPage')
        } 
        else {
            Toast("Unexpected response while creating the post.")
        }
    })
    .catch(error => {
        console.error('Error in the post:', error)
        errorPage(500, "Failed to connect to the server. Please try again later.")
        showPage('ErrorPage')
    })
}

