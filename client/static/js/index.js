const pages = ['home-page', 'register-login-page', 'add-post-page', 'single-post-page', 'ErrorPage'];
const navbar = document.getElementById('navbar');
const postsContainer = document.getElementById('postsContainer');
const toHomeButton = document.getElementById('to-home');
const toPostButton = document.getElementById('to-post');
const toMessagesButton = document.getElementById('to-messages');
const iconesNav = document.getElementById('icones-nav');
const selectCategories = document.getElementById('categories');

// Initialize page
function initializePage() {
  pages.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  navbar.style.display = 'none';

  toPostButton.addEventListener('click', () => {
    showPage('add-post-page')
  })
}


// this function check the sessions of the users if its valid or no
function checkSession() {
  fetch('/api/check-session', {
    credentials: 'include',
  })
    .then(response => response.json())
    .then(result => {
      if (result.status === 200 && result.message === "ok") {
        showPage('home-page')
      } else if (result.status === 401) {
        const existingPopup = document.querySelector('.chat-popup')
        if (existingPopup) {
          existingPopup.remove()
        }
        showPage('register-login-page')
      } else {
        const existingPopup = document.querySelector('.chat-popup')
        if (existingPopup) {
          existingPopup.remove()
        }
        errorPage(result.status || 500, result.message || "Unexpected error");
        showPage('ErrorPage');
      }
    })
    .catch(err => {
      console.error("Session check failed:", err)
      errorPage(500, "Failed to verify session. Try again later.");
      showPage('ErrorPage');
    });
}

// Session check on page load is the first thing we have to do
window.addEventListener('DOMContentLoaded', () => {
  initializePage();
  checkSession()
});



// this function handles the logic of the page that we should show to the user
function showPage(pageId) {
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none'
  })

  navbar.style.display = (pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex'
  toPostButton.style.display = (pageId === 'add-post-page' || pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex'

  if (pageId === 'home-page') {
    connectWebSocket()
    loadPosts()
  } else if (pageId === 'add-post-page') {
    loadCategories()
    emptyInputs()
  }
}

// this functions load the post to the home page, handles the case of no posts , and the case of posts
function loadPosts() {
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify()
  }

  fetch('/api/get-posts', options)
    .then(response => response.json())
    .then(data => {
      if (data.status && data.message) {
        if (data.status == 401) {
            showPage('register-login-page')
            return
        }
        errorPage(data.status, data.message)
        showPage('ErrorPage')
        return
      }

      if (!Array.isArray(data)) {
        errorPage(500, "Unexpected data format while loading posts.")
        showPage('ErrorPage')
        return
      }

      postsContainer.innerHTML = ""

      if (data.length === 0) {
        displayNoPosts()
        return
      }

      renderPosts(data)
    })
    .catch(error => {
      console.error("Failed to load posts", error)
      errorPage(500, "Failed to connect to the server. Please try again later.")
      showPage('ErrorPage')
    })
}

// case of no posts , that what we show to the user
function displayNoPosts() {
  const noPosts = document.createElement('div')
  noPosts.style.textAlign = 'center'
  noPosts.style.padding = '30px'
  noPosts.style.color = '#888'
  noPosts.textContent = 'No posts found.'
  postsContainer.appendChild(noPosts)
}


// case of posts finded , this function handles the logic of it
function renderPosts(posts) {
  posts.forEach(post => {
    const postCard = document.createElement('div');
    postCard.id = "postCard";
    postCard.addEventListener('click', () => {
      showSinglePost(post.id);
    });
    postCard.style.cursor = "pointer";

    const createdDate = new Date(post.created_at);
    const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const user = `By: ${post.user_name}`;

    postCard.append(
      createField(post.title),
      createField(post.categories),
      createField(post.content),
      createField(formattedDate),
      createField(user)
    );

    postsContainer.append(postCard);
  });
}

// create fields of posts and comments
function createField(valueText) {
  const field = document.createElement('div')
  const value = document.createElement('span')
  value.textContent = valueText
  field.append(value)
  return field
}