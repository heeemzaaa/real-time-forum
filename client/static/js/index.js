const pages = ['home-page', 'register-login-page', 'add-post-page', 'profile-page', 'single-post-page']

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
        document.getElementById('usernameDisplay').textContent = result.username + " " + "▼"
        showPage('home-page')
      } else {
        showPage('register-login-page')
      }
    }).catch(() => {
      showPage('register-login-page')
    })
})

function loadPosts() {
  fetch('/api/get-posts', {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(posts => {
      const section = document.getElementById('home-page')
      section.innerHTML = ""

      section.style.display = "grid";
      section.style.gridTemplateColumns = "1fr";
      section.style.width = "100%";

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

        postCard.append(
          createField(post.Title),
          createField(post.Category),
          createField(post.Content),
          createField(formattedDate)
        )

        section.append(postCard)
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

  if (pageId === 'home-page') {
    loadPosts()
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