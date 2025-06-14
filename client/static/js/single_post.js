function showSinglePost(postId) {
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

            // Format date to be more readable
            const createdDate = new Date(post.created_at);
            const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            container.append(
                createField(post.title),
                createField(post.categories),
                createField(post.content),
                createField(formattedDate)
            )

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
            } else if (result.message === "You must be logged in to comment") {
                showPage('register-login-page')
            } else {
                alert("You can't add this comment")
            }
        })
        .catch(error => {
            console.error("Error adding comment:", error)
        })
}
