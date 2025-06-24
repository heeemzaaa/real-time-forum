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
  pages.forEach(id => document.getElementById(id).style.display = 'none');
  navbar.style.display = 'none';

  toPostButton.addEventListener('click', () => showPage('add-post-page'));
}


// this function check the sessions of the users if its valid or no
async function checkSession() {
  try {
    const response = await fetch('/api/check-session')
    const result = await response.json()

    if (result.status === 200 && result.message === "ok") {
      showPage('home-page')
    } else if (result.status === 401) {
      handleUnauthorized()
    } else {
      closePopup()
      errorPage(result.status || 500, result.message || "Unexpected error");
      showPage('ErrorPage');
    }

  } catch (error) {
    console.error("Session check failed:", error)
    errorPage(500, "Failed to verify session. Try again later.");
    showPage('ErrorPage');
  }
}

// Session check on page load is the first thing we have to do
window.addEventListener('DOMContentLoaded', () => {
  initializePage();
  checkSession()
});



// this function handles the logic of the page that we should show to the user
function showPage(pageId) {
  let doNotConnect = (pageId === 'register-login-page' || pageId === 'ErrorPage');

  pages.forEach(id => document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none');

  if (!doNotConnect) connectWebSocket();

  navbar.style.display = (pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex'
  toPostButton.style.display = (pageId === 'add-post-page' || pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex'


  if (pageId === 'home-page') {
    loadPosts()
  } else if (pageId === 'add-post-page') {
    loadCategories()
    emptyInputs()
  } else if (pageId === 'register-login-page') {
    emptyLogsInputs()
  }
}

// this functions load the post to the home page, handles the case of no posts , and the case of posts
async function loadPosts() {
  try {
    const response = await fetch('/api/get-posts')
    const data = await response.json()

    if (data.status != 200 && data.message) {
      if (data.status == 401) {
        handleUnauthorized("You must login to see posts")
        return
      }

      errorPage(data.status, data.message)
      showPage('ErrorPage')
      return
    }

    if (data.status == 200 && data.message == "There is no posts") {
      postsContainer.innerHTML = ""
      displayNoPosts()
      return
    }

    if (!Array.isArray(data)) {
      errorPage(500, "Unexpected data format while loading posts.")
      showPage('ErrorPage')
      return
    }

    postsContainer.innerHTML = ""
    renderPosts(data)

  } catch (error) {
    console.error("Failed to load posts", error)
    errorPage(500, "Failed to connect to the server. Please try again later.")
    showPage('ErrorPage')
  }
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
      showSinglePost(post.id)
    })
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