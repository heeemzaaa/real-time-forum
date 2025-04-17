function toggleDropdown() {
  document.querySelector('.user-menu').classList.toggle('active');
}

function showPage(pageId) {
  const pages = ['register-login-page', 'home-page', 'add-post-page', 'profile-page' , 'error-page']
  pages.forEach(id => {
    document.getElementById(id).style.display = (id === pageId) ? 'block' : 'none'
  })

  if (pageId === 'register-login-page') {
    navbar.style.display = 'none';
  } else {
    navbar.style.display = 'flex';
  }
}

window.addEventListener('click', function (e) {
  const menu = document.querySelector('.user-menu')
  if (!menu.contains(e.target)) {
    menu.classList.remove('active')
  }
})







