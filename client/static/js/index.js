const pages = ['home-page', 'register-login-page', 'add-post-page', 'profile-page', 'single-post-page', 'chat-page']

pages.forEach(id => {
  document.getElementById(id).style.display = 'none'
})
navbar.style.display = 'none'

window.addEventListener('DOMContentLoaded', () => {
  fetch('/api/check-session', {
    credentials: 'include',
  })
    .then(response => response.json())
    .then(result => {
      if (result.message === "ok") {
        showPage('home-page')
      } else {
        showPage('register-login-page')
      }
    }).catch(() => {
      showPage('register-login-page')
    })
})

function loadPosts(categoryFilter = null) {
  // Create request options
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ category: categoryFilter })
  };

  // Always use the same endpoint without changing the URL
  fetch('/api/get-posts', options)
    .then(response => response.json())
    .then(posts => {
      console.log(posts)
      const postsContainer = document.getElementById('postsContainer')
      postsContainer.innerHTML = ""

      if (posts.length === 0) {
        const noPosts = document.createElement('div')
        noPosts.style.textAlign = 'center'
        noPosts.style.padding = '30px'
        noPosts.style.color = '#888'
        noPosts.textContent = categoryFilter ?
          `No posts found in the "${categoryFilter}" category.` :
          'No posts found.'
        postsContainer.appendChild(noPosts)
        return
      }

      posts.forEach(post => {
        const postCard = document.createElement('div')
        postCard.id = "postCard"
        // Add click event to each post card
        postCard.addEventListener('click', () => {
          showSinglePost(post.id)
        })
        postCard.style.cursor = "pointer"

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

        const user = `By: ${post.user_name}`


        postCard.append(
          createField(post.Title),
          createField(post.Category),
          createField(post.Content),
          createField(formattedDate),
          createField(user)
        )

        postsContainer.append(postCard)
      })
    }).catch(error => {
      console.error("Failed to load posts", error)
    })
}

function toggleDropdown() {
  document.querySelector('.user-menu').classList.toggle('active');
}

function showPage(pageId) {
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none'
  })

  if (pageId === 'register-login-page') {
    navbar.style.display = 'none';
  } else {
    navbar.style.display = 'flex';
  }

  if (pageId === 'home-page' || pageId === 'single-post-page') {
    document.getElementById('icones-nav').style.display = 'flex'
  } else {
    document.getElementById('icones-nav').style.display = 'none'
  }

  if (pageId === 'home-page') {
    loadCategoryFilters() // Load category filters first
    loadPosts() // Then load all posts
  }

  if (pageId === 'add-post-page') {
    loadCategories()
  }
}


window.addEventListener('click', function (e) {
  const menu = document.querySelector('.user-menu')
  if (!menu.contains(e.target)) {
    menu.classList.remove('active')
  }
})

function loadCategoryFilters() {
  fetch('/api/get-categories', {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(categories => {
      const categoriesFilter = document.getElementById('categoriesFilter')
      categoriesFilter.innerHTML = ""

      // Add "All" button first
      const allButton = document.createElement('button')
      allButton.className = 'category-button active'
      allButton.textContent = 'All'
      allButton.addEventListener('click', () => {
        setActiveCategory(allButton)
        loadPosts()
      })
      categoriesFilter.appendChild(allButton)

      // Add buttons for each category
      categories.forEach(category => {
        const button = document.createElement('button')
        button.className = 'category-button'
        button.textContent = category.Category_name
        button.addEventListener('click', () => {
          setActiveCategory(button)
          loadPosts(category.Category_name)
        })
        categoriesFilter.appendChild(button)
      })
    })
    .catch(error => {
      console.error("Failed to load categories", error)
    })
}

// Helper function to set active category button
function setActiveCategory(activeButton) {
  const buttons = document.querySelectorAll('.category-button')
  buttons.forEach(button => {
    button.classList.remove('active')
  })
  activeButton.classList.add('active')
}


document.getElementById('to-home').addEventListener('click', function () {
  showPage('home-page')
})

document.getElementById('to-post').addEventListener('click', function () {
  showPage('add-post-page')
})

document.getElementById('to-messages').addEventListener('click', function () {
  showPage('chat-page')
})