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
  // Hide all pages initially
  pages.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  navbar.style.display = 'none';

  toPostButton.addEventListener('click', () => {
    showPage('add-post-page')
  })
}

// Session check on page load
window.addEventListener('DOMContentLoaded', () => {
  initializePage();
  checkSession()
});

function checkSession() {
  fetch('/api/check-session', {
    credentials: 'include',
  })
    .then(response => response.json())
    .then(result => {
      if (result.message === "ok") {
        showPage('home-page');
      } else if (result.message === "Error in the cookie" || result.message === "try to login again") {
        showPage('register-login-page')
      }
    }).catch(() => {
      errorPage(500, "Failed to verify session. Try again later.")
      showPage('ErrorPage');
    });
}

// Page navigation
function showPage(pageId) {
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none';
  });

  navbar.style.display = (pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex';
  toPostButton.style.display = (pageId === 'add-post-page' || pageId === 'register-login-page' || pageId === 'ErrorPage') ? 'none' : 'flex'

  if (pageId === 'home-page') {
    connectWebSocket()
    loadPosts()
  } else if (pageId === 'add-post-page') {
    loadCategories();
  }
}

// Post loading functions
function loadPosts() {
  // Create request options
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify()
  };

  fetch('/api/get-posts', options)
    .then(response => response.json())
    .then(posts => {
      postsContainer.innerHTML = "";

      if (posts.length === 0) {
        displayNoPosts();
        return;
      }

      renderPosts(posts);
    }).catch(error => {
      console.error("Failed to load posts", error);
    });
}

function displayNoPosts() {
  const noPosts = document.createElement('div');
  noPosts.style.textAlign = 'center';
  noPosts.style.padding = '30px';
  noPosts.style.color = '#888';
  noPosts.textContent = 'No posts found.';
  postsContainer.appendChild(noPosts);
}

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

function createField(valueText) {
  const field = document.createElement('div');
  const value = document.createElement('span');
  value.textContent = valueText;
  field.append(value);
  return field;
}