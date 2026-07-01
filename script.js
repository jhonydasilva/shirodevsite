document.getElementById('year').textContent = new Date().getFullYear();

const soundButton = document.querySelector('.sound-button');
const loader = document.getElementById('page-loader');
const navLinks = document.querySelectorAll('.topnav .nav-link');
let ytPlayer;
let ytReady = false;

function hideLoader() {
  if (!loader) return;
  loader.classList.add('hidden');
}

if (loader) {
  window.addEventListener('load', () => {
    setTimeout(hideLoader, 650);
  });
}

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('background-player', {
    height: '0',
    width: '0',
    videoId: 'E8gmARGvPlI',
    playerVars: {
      autoplay: 1,
      controls: 0,
      loop: 1,
      playlist: 'E8gmARGvPlI',
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      playsinline: 1,
      disablekb: 1,
    },
    events: {
      onReady: (event) => {
        ytReady = true;
        event.target.setVolume(5);
        event.target.unMute();
        event.target.playVideo();
        if (soundButton) {
          soundButton.classList.add('playing');
          soundButton.setAttribute('aria-label', 'Desativar música');
        }
      },
    },
  });
}

if (soundButton) {
  soundButton.addEventListener('click', () => {
    if (!ytReady || !ytPlayer) return;

    if (ytPlayer.isMuted()) {
      ytPlayer.unMute();
      if (ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
        ytPlayer.playVideo();
      }
      soundButton.classList.add('playing');
      soundButton.setAttribute('aria-label', 'Desativar música');
    } else {
      ytPlayer.mute();
      soundButton.classList.remove('playing');
      soundButton.setAttribute('aria-label', 'Ativar música');
    }
  });
}

function updateActiveLink(pathname = window.location.pathname) {
  navLinks.forEach((link) => {
    const linkPath = new URL(link.href, window.location.href).pathname;
    if (linkPath === pathname) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

async function loadPage(url, addToHistory = true) {
  if (loader) loader.classList.remove('hidden');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar ${url}`);

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const newMain = doc.querySelector('main');
    const newTitle = doc.querySelector('title');

    if (newMain) {
      const currentMain = document.querySelector('main');
      currentMain.replaceWith(newMain);
    }

    if (newTitle) {
      document.title = newTitle.textContent;
    }

    const newPath = new URL(url, window.location.href).pathname;
    updateActiveLink(newPath);
    window.scrollTo(0, 0);

    if (addToHistory) {
      window.history.pushState({ url }, '', url);
    }
  } catch (error) {
    console.error(error);
    window.location.href = url;
  } finally {
    if (loader) hideLoader();
  }
}

window.addEventListener('popstate', (event) => {
  const path = event.state?.url || window.location.pathname;
  loadPage(path, false);
});

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.origin !== window.location.origin) return;
    if (targetUrl.pathname === window.location.pathname) return;

    event.preventDefault();
    loadPage(targetUrl.href);
  });
});

