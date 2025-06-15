// this function shows the post you clicked on with its comments
function showSinglePost(postId) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include'
    }

    fetch('/api/get-post', options)
        .then(response => response.json())
        .then(data => {
            if (data.status && data.message) {
                errorPage(data.status, data.message)
                showPage('ErrorPage')
                return
            }

            const container = document.getElementById('singlePostContainer')
            container.innerHTML = ""

            const createdDate = new Date(data.created_at)
            const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

            container.append(
                createField(data.title),
                createField(Array.isArray(data.categories) ? data.categories.join(', ') : ""),
                createField(data.content),
                createField(formattedDate)
            )

            loadComments(postId)

            const submitBtn = document.getElementById('submitComment')
            submitBtn.onclick = () => submitComment(postId)

            showPage('single-post-page')
        })
        .catch(error => {
            console.error("Failed to load post", error)
            errorPage(500, "Failed to fetch post. Please try again later.")
            showPage('ErrorPage')
        })
}

// this function loads comments of the post choosen
function loadComments(postId) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_id: postId }),
        credentials: 'include'
    }

    fetch('/api/get-comments', options)
        .then(response => response.json())
        .then(data => {
            const commentsList = document.getElementById('commentsList')
            commentsList.innerHTML = ""

            if (data.status && data.message) {
                if (data.status === 200 && data.message === "this post has no comments") {
                    const noComments = document.createElement('div')
                    noComments.className = 'noComments'
                    noComments.textContent = 'No comments yet. Be the first to comment!'
                    commentsList.appendChild(noComments)
                    return
                }

                errorPage(data.status, data.message)
                showPage('ErrorPage')
                return
            }

            if (!Array.isArray(data)) {
                errorPage(500, "Unexpected comment data received.")
                showPage('ErrorPage')
                return
            }

            data.forEach(comment => {
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
        })
        .catch(error => {
            console.error("Failed to load comments", error)
            errorPage(500, "Failed to load comments. Try again later.")
            showPage('ErrorPage')
        })
}

// this function handles the case of adding a new comment
function submitComment(postId) {
    const content = document.getElementById('commentContent').value.trim()
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            post_id: postId,
            content: content
        }),
        credentials: 'include'
    }

    if (!content) {
        Toast("Comment cannot be empty")
        return
    }

    fetch('/api/add-comment', options)
    .then(response => response.json())
    .then(result => {
        if (result.status === 200 && result.message === "Comment added successfully") {
            document.getElementById('commentContent').value = ""
            loadComments(postId)
        } 
        else if (result.status === 401) {
            showPage('register-login-page')
            Toast("You have to login to add a comment")
        } 
        else if (result.status === 400) {
            Toast(result.message || "Invalid input. Please try again.")
        } 
        else if (result.status === 405) {
            errorPage(result.status, "Method not allowed")
            showPage('ErrorPage')
        }
        else if (result.status === 500) {
            errorPage(result.status, "Server error while submitting comment.")
            showPage('ErrorPage')
        } 
        else {
            Toast("Unexpected error while submitting comment.")
        }
    })
    .catch(error => {
        console.error("Error adding comment:", error)
        errorPage(500, "Failed to connect to the server.")
        showPage('ErrorPage')
    })
}
