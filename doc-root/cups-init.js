/* Only display document if we are not in a frame... */
if (self == top) {
  document.documentElement.style.display = 'block';
} else {
  top.location = self.location;
}

/* Show an error if cookies are disabled */
function check_cookies() {
  var bodyElement = document.getElementById('body');
  if (!navigator.cookieEnabled && bodyElement) {
    if (bodyElement) {
      bodyElement.innerHTML = 'This page uses cookies to prevent common cross-site attacks. Please enable cookies in your browser.';
    }
  }
}
