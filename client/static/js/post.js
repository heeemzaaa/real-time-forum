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

function showSinglePost(postId) {
    // Get the post details from the server
    fetch(`/api/get-post/${postId}`, {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(post => {
            const container = document.getElementById('singlePostContainer')
            container.innerHTML = ""

            // Add back button
            const backButton = document.createElement('div')
            backButton.className = 'backButton'
            backButton.textContent = '← Back to Posts'
            backButton.addEventListener('click', () => {
                showPage('home-page')
            })
            document.getElementById('single-post-page').appendChild(backButton)

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

            container.append(
                createField(post.Title),
                createField(post.Category),
                createField(post.Content),
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

// Add function to load comments for a post
function loadComments(postId) {
    fetch(`/api/get-comments/${postId}`, {
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

// Add function to submit a comment
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
            } else {
                alert("Failed to add comment")
            }
        })
        .catch(error => {
            console.error("Error adding comment:", error)
        })
}
