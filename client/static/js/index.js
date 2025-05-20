const pages = ['home-page', 'register-login-page', 'add-post-page', 'profile-page', 'single-post-page', 'chat-page'];
const navbar = document.getElementById('navbar');
const postsContainer = document.getElementById('postsContainer');
const userMenu = document.querySelector('.user-menu');
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

  // Add event listeners for navigation
  toHomeButton.addEventListener('click', () => showPage('home-page'));
  toPostButton.addEventListener('click', () => showPage('add-post-page'));
  toMessagesButton.addEventListener('click', () => showPage('chat-page'));

}

// Session check on page load
window.addEventListener('DOMContentLoaded', () => {
  initializePage();

  fetch('/api/check-session', {
    credentials: 'include',
  })
    .then(response => response.json())
    .then(result => {
      if (result.message === "ok") {
        showPage('home-page');
      } else {
        showPage('register-login-page');
      }
    }).catch(() => {
      showPage('register-login-page');
    });
});

// Page navigation
function showPage(pageId) {
  // Show selected page, hide others
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none';
  });

  navbar.style.display = (pageId === 'register-login-page') ? 'none' : 'flex';

  iconesNav.style.display = (pageId === 'register-login-page') ? 'none' : 'flex';

  if (pageId === 'home-page') {
    loadOnlineUsers();
    loadPosts(); // Load all posts
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

  // Always use the same endpoint without changing the URL
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
    // console.log("this is the posts:",post);
    
    const postCard = document.createElement('div');
    postCard.id = "postCard";
    postCard.addEventListener('click', () => {
      showSinglePost(post.id);
    });
    postCard.style.cursor = "pointer";

    let Categories = post.categories
    // console.log(Categories);
    

    // Format date to be more readable
    const createdDate = new Date(post.created_at);
    const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const user = `By: ${post.user_name}`;

    postCard.append(
      createField(post.title),
      createField(Categories),
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

// Category functions
function loadCategories() {
  fetch('/api/get-categories', {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(categories => {
      console.log(categories)
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

// User menu toggle
function toggleDropdown() {
  userMenu.classList.toggle('active');
}