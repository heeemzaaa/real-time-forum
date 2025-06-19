function Toast(message) {
    if (document.querySelector(".toast")) return
    let toast = document.createElement("div")
    toast.className = "toast"
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.5s forwards, fadeOut 0.5s ease';
        toast.remove();
    }, 4000);
}

// this is the debounce function used in the scroll
function debounce(func, delay) {
    let timer
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(() => func(...args), delay)
    }
}

// create fields of posts and comments
function createField(valueText) {
  const field = document.createElement('div')
  const value = document.createElement('span')
  value.textContent = valueText
  field.append(value)
  return field
}

function test(obj, method) {
    if (obj.rgx.test(obj.input.value) || obj.rgx2?.test(obj.input.value)) {
        obj.status = true
        obj.error.classList.add('hidden')
    } else {
        obj.status = false
        obj.error.classList.remove('hidden')
        obj.error.style.color = 'red'
    }
    method.check()
}