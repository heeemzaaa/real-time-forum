const select = document.getElementById('categories');
const addCategory = document.getElementById('addCategory');
const custom = document.getElementById('custom');
const title = document.getElementById('title');
const content = document.getElementById('content');
const submit = document.getElementById('submit');
const categoryError = document.getElementById('categoryError');
let options = select.options;
let newCategory = "";
let category = "";
let categoryStatus = false;
let contentStatus = false;
let titleStatus = false;
let categories = [];
let categoriesSlice = [];

// Category functions
function loadCategories() {
  fetch('/api/get-categories', {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(categories => {
      categories.forEach(category => {
        categoriesSlice.push(category)
        const option = document.createElement('option')
        option.value = category.Category_name
        option.textContent = category.Category_name
        selectCategories.appendChild(option)
      })
    }).catch(error => {
      console.error("Failed to load categories", error);
    });
}

function validPost() {
    if (categoryStatus && contentStatus && titleStatus) {
        document.getElementById('submit').disabled = false
    } else {
        document.getElementById('submit').disabled = true
    }
}




title.addEventListener('input', function () {
    if (document.getElementById('title').value === '') {
        titleStatus = false
    } else {
        titleStatus = true
    }
    validPost()
})

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

select.addEventListener('change', function (event) {
    let selectedCategory = event.target.value;
    console.log(selectedCategory)
    categories.push(selectedCategory)
    categoryStatus = true
    validPost()
})

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

submit.addEventListener('click', function (event) {
    event.preventDefault()
    addPost()

    title.value = ""
    categories = []
    content.value = ""
    custom.value = ""
})

function addPost() {
    const postData = {
        title: title.value,
        categories: categories,
        content: content.value
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
}

