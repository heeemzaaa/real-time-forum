const select = document.getElementById('categories');
const addCategory = document.getElementById('addCategory');
const custom = document.getElementById('custom');
const title = document.getElementById('title');
// const selectCategories = document.getElementById('categories');
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



function validPost() {
    if (categoryStatus && contentStatus && titleStatus) {
        // console.log(categoryStatus)
        // console.log(contentStatus)
        document.getElementById('submit').disabled = false
    } else {
        // console.log(categoryStatus)
        // console.log(contentStatus)
        document.getElementById('submit').disabled = true
    }
}


let categoriesSlice = [];
// for (let i = 0; i < options.length; i++) {
//     if (!options[i].disabled) {
//         categoriesSlice.push(options[i].value);
//     }
// }

// console.log("options:" , options);


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

    console.log(postData);

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

function showSinglePost(postId) {
    // Get the post details from the server
    fetch('/api/get-post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(post => {
            const container = document.getElementById('singlePostContainer')
            container.innerHTML = ""

            function createField(valueText) {
                const field = document.createElement('div')
                const value = document.createElement('span')
                value.textContent = valueText
                field.append(value)
                return field
            }

            // Format date to be more readable
            const createdDate = new Date(post.created_at);
            const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            let Categories = post.categories
            console.log(Categories);



            container.append(
                createField(post.title),
                createField(Categories),
                createField(post.content),
                createField(formattedDate)
            )

            // Load comments for this post
            loadComments(postId)

            // Set up comment submission for this post
            const submitBtn = document.getElementById('submitComment')
            submitBtn.onclick = () => submitComment(postId)

            // Show the single post page
            showPage('single-post-page')
        })
        .catch(error => {
            console.error("Failed to load post", error)
        })
}

function loadComments(postId) {
    fetch('/api/get-comments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(comments => {
            const commentsList = document.getElementById('commentsList')
            commentsList.innerHTML = ""

            if (comments.length === 0) {
                const noComments = document.createElement('div')
                noComments.className = 'noComments'
                noComments.textContent = 'No comments yet. Be the first to comment!'
                commentsList.appendChild(noComments)
            } else {
                comments.forEach(comment => {
                    const commentCard = document.createElement('div')
                    commentCard.className = 'commentCard'

                    const commentContent = document.createElement('div')
                    commentContent.className = 'commentContent'
                    commentContent.textContent = comment.content

                    const commentMeta = document.createElement('div')
                    commentMeta.className = 'commentMeta'

                    const commentUser = document.createElement('span')
                    commentUser.textContent = `By: ${comment.UserName}`

                    const commentDate = document.createElement('span')
                    const date = new Date(comment.created_at)
                    commentDate.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

                    commentMeta.appendChild(commentUser)
                    commentMeta.appendChild(commentDate)

                    commentCard.appendChild(commentContent)
                    commentCard.appendChild(commentMeta)

                    commentsList.appendChild(commentCard)
                })
            }
        })
        .catch(error => {
            console.error("Failed to load comments", error)
        })
}

function submitComment(postId) {
    const content = document.getElementById('commentContent').value.trim()

    if (!content) {
        alert("Comment cannot be empty")
        return
    }

    fetch('/api/add-comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            post_id: postId,
            content: content
        }),
        credentials: 'include'
    })
        .then(response => response.json())
        .then(result => {
            if (result.message === "Comment added successfully") {
                document.getElementById('commentContent').value = ""
                loadComments(postId)
            } else if (result.message === "You must be logged in to comment"){
                showPage('register-login-page')
            } else {
                alert("You can't add this comment")
            }
        })
        .catch(error => {
            console.error("Error adding comment:", error)
        })
}
