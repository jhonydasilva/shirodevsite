(function () {
  var AUDIO_PLAYING_KEY = "shirodev:audio-playing";
  var INTERNAL_NAVIGATION_KEY = "shirodev:internal-navigation";
  var MUSIC_VOLUME = 0.03;
  var INTERNAL_PAGES = {
    "index.html": true,
    "projetos.html": true,
    "setup.html": true
  };

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Browsers can restrict localStorage when the site is opened as a local file.
    }
  }

  function sessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function sessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Session storage can be unavailable for local files in some browsers.
    }
  }

  function sessionRemove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      // Session storage can be unavailable for local files in some browsers.
    }
  }

  function setupParticles() {
    var canvas = document.getElementById("particles-canvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    var particles = [];
    for (var i = 0; i < 80; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(function (particle) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(88, 101, 242, " + particle.opacity + ")";
        ctx.fill();
      });

      for (var a = 0; a < particles.length; a += 1) {
        for (var b = a + 1; b < particles.length; b += 1) {
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = "rgba(88, 101, 242, " + 0.08 * (1 - distance / 100) + ")";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      window.requestAnimationFrame(draw);
    }

    draw();
  }

  function volumeOffIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><line x1="23" y1="9" x2="23" y2="15"></line></svg>';
  }

  function volumeOnIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></svg>';
  }

  function setupAudioButtons() {
    document.querySelectorAll("button[title]").forEach(function (button) {
      if (button.dataset.audioReady === "true") return;

      var audio = button.previousElementSibling;
      if (!audio || audio.tagName !== "AUDIO") return;

      button.dataset.audioReady = "true";
      audio.preload = "auto";
      audio.volume = MUSIC_VOLUME;

      function setPlaying(playing) {
        button.title = playing ? "Pausar musica" : "Tocar musica";
        button.setAttribute("aria-label", button.title);
        button.setAttribute("aria-pressed", playing ? "true" : "false");
        button.innerHTML = playing ? volumeOnIcon() : volumeOffIcon();
      }

      function resetTime() {
        try {
          audio.currentTime = 0;
        } catch (error) {
          // currentTime can fail before the browser has loaded metadata.
        }
      }

      function playAudio() {
        return audio.play().then(function () {
          storageSet(AUDIO_PLAYING_KEY, "true");
          setPlaying(true);
        });
      }

      window.shirodevPlayMusic = playAudio;

      resetTime();
      audio.addEventListener("loadedmetadata", resetTime, { once: true });

      button.addEventListener("click", function () {
        if (audio.paused) {
          playAudio().then(null, function () {
            setPlaying(false);
          });
        } else {
          audio.pause();
          storageSet(AUDIO_PLAYING_KEY, "false");
          setPlaying(false);
        }
      });

      if (storageGet(AUDIO_PLAYING_KEY) === "true") {
        playAudio().then(null, function () {
          setPlaying(false);
        });
      } else {
        setPlaying(false);
      }
    });
  }

  function setupIntroGate() {
    var gate = document.querySelector("[data-intro-gate]");
    if (!gate) return;

    var viewButton = gate.querySelector("[data-intro-view]");
    if (!viewButton) return;

    document.documentElement.classList.add("intro-gate-open");
    try {
      viewButton.focus({ preventScroll: true });
    } catch (error) {
      viewButton.focus();
    }

    function hideGate() {
      gate.classList.add("intro-gate--hidden");
      document.documentElement.classList.remove("intro-gate-open");

      window.setTimeout(function () {
        gate.setAttribute("hidden", "hidden");
      }, 420);
    }

    viewButton.addEventListener("click", function () {
      viewButton.disabled = true;

      if (typeof window.shirodevPlayMusic === "function") {
        try {
          var playRequest = window.shirodevPlayMusic();
          if (playRequest && typeof playRequest.then === "function") {
            playRequest.then(null, function () {});
          }
        } catch (error) {
          // The intro should still open the site if the browser refuses playback.
        }
      }

      hideGate();
    });
  }

  function setupCustomCursor() {
    var hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasFinePointer || prefersReducedMotion) return;

    var cursor = document.createElement("div");
    cursor.className = "custom-cursor-dot";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);

    var currentX = window.innerWidth / 2;
    var currentY = window.innerHeight / 2;
    var targetX = currentX;
    var targetY = currentY;
    var visible = false;
    var lastParticleAt = 0;
    var lastParticleX = targetX;
    var lastParticleY = targetY;

    function setCursorVisibility(nextVisible) {
      if (visible === nextVisible) return;

      visible = nextVisible;
      cursor.classList.toggle("is-visible", visible);
      document.body.classList.toggle("custom-cursor-ready", visible);
    }

    function moveCursor() {
      currentX += (targetX - currentX) * 0.28;
      currentY += (targetY - currentY) * 0.28;
      cursor.style.transform = "translate3d(" + currentX + "px, " + currentY + "px, 0) translate(-50%, -50%)";
      window.requestAnimationFrame(moveCursor);
    }

    function spawnParticle(x, y, movementX, movementY) {
      var particle = document.createElement("span");
      var size = Math.random() * 5 + 4;
      var movementLength = Math.sqrt(movementX * movementX + movementY * movementY) || 1;
      var driftX = (Math.random() - 0.5) * 18 - (movementX / movementLength) * 34;
      var driftY = (Math.random() - 0.5) * 18 - (movementY / movementLength) * 34;

      particle.className = "custom-cursor-particle";
      particle.setAttribute("aria-hidden", "true");
      particle.style.left = x + "px";
      particle.style.top = y + "px";
      particle.style.setProperty("--particle-size", size + "px");
      particle.style.setProperty("--particle-x", driftX + "px");
      particle.style.setProperty("--particle-y", driftY + "px");

      document.body.appendChild(particle);
      window.setTimeout(function () {
        particle.remove();
      }, 700);
    }

    document.addEventListener("mousemove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      setCursorVisibility(true);

      var now = window.performance ? window.performance.now() : Date.now();
      var dx = targetX - lastParticleX;
      var dy = targetY - lastParticleY;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 9 && now - lastParticleAt > 22) {
        spawnParticle(targetX, targetY, dx, dy);
        lastParticleAt = now;
        lastParticleX = targetX;
        lastParticleY = targetY;
      }
    });

    document.addEventListener("mouseleave", function () {
      setCursorVisibility(false);
    });

    document.addEventListener("mouseenter", function () {
      setCursorVisibility(true);
    });

    document.addEventListener("mousedown", function () {
      cursor.classList.add("is-pressing");
    });

    document.addEventListener("mouseup", function () {
      cursor.classList.remove("is-pressing");
    });

    moveCursor();
  }

  function setupContextMenuBlock() {
    document.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });

    document.addEventListener("selectstart", function (event) {
      event.preventDefault();
    });

    document.addEventListener("copy", function (event) {
      event.preventDefault();
    });

    document.addEventListener("cut", function (event) {
      event.preventDefault();
    });

    document.addEventListener("dragstart", function (event) {
      event.preventDefault();
    });

    document.addEventListener("keydown", function (event) {
      var key = event.key || "";
      var opensContextMenu = key === "ContextMenu" || (event.shiftKey && key === "F10");
      var copyShortcut = (event.ctrlKey || event.metaKey) && ["a", "c", "x"].indexOf(key.toLowerCase()) !== -1;

      if (opensContextMenu || copyShortcut) {
        event.preventDefault();
      }
    });
  }

  function pageFromUrl(url) {
    var link = document.createElement("a");
    link.href = url;

    var name = link.pathname.split("/").pop();
    if (!name || name === "") return "index.html";
    if (name === "projetos") return "projetos.html";
    if (name === "setup") return "setup.html";
    return name;
  }

  function currentPage() {
    return pageFromUrl(window.location.href);
  }

  function redirectToHome() {
    var homeUrl = new URL("index.html", window.location.href);
    if (homeUrl.href !== window.location.href) {
      window.location.replace(homeUrl.href);
    }
  }

  function ensureHomeEntryPage() {
    var page = currentPage();
    var isHomeUrl = page === "index.html";
    var hasIntroGate = document.querySelector("[data-intro-gate]") !== null;

    if (isHomeUrl && !hasIntroGate) {
      redirectToHome();
      return;
    }

    if (page !== "setup.html") return;

    if (sessionGet(INTERNAL_NAVIGATION_KEY) === "true") {
      sessionRemove(INTERNAL_NAVIGATION_KEY);
      return;
    }

    redirectToHome();
  }

  function setupActiveNav() {
    var page = currentPage();
    var inactiveClasses = "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]/30";

    document.querySelectorAll("nav a").forEach(function (link) {
      var href = link.getAttribute("href");
      var target = href ? pageFromUrl(href) : "";
      var active = target === page || (target === "" && page === "index.html");
      var marker = link.querySelector("span");

      if (!link.dataset.baseClass) {
        link.dataset.baseClass = link.className.replace("text-white", inactiveClasses);
      }

      link.className = active
        ? link.dataset.baseClass.replace(inactiveClasses, "text-white")
        : link.dataset.baseClass;

      if (!marker) return;

      if (!marker.dataset.baseClass) {
        marker.dataset.baseClass = marker.className.replace("w-full", "w-0 group-hover:w-2/3");
      }

      marker.className = active
        ? marker.dataset.baseClass.replace("w-0 group-hover:w-2/3", "w-full")
        : marker.dataset.baseClass;
    });
  }

  function isInternalPageLink(link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (link.target && link.target !== "_self") return false;

    var targetUrl = new URL(href, window.location.href);
    var currentUrl = new URL(window.location.href);
    if (targetUrl.origin !== currentUrl.origin) return false;

    return INTERNAL_PAGES[pageFromUrl(targetUrl.href)] === true;
  }

  function pageContentFromDocument(doc) {
    return doc.querySelector(".relative.z-20 > header + *");
  }

  function navigateInternally(url, options) {
    var targetPage = pageFromUrl(url);

    if (targetPage === currentPage()) {
      setupActiveNav();
      return Promise.resolve();
    }

    return fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Navigation request failed");
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var nextDoc = parser.parseFromString(html, "text/html");
        var nextContent = pageContentFromDocument(nextDoc);
        var currentContent = pageContentFromDocument(document);

        if (!nextContent || !currentContent) {
          throw new Error("Page content not found");
        }

        currentContent.replaceWith(nextContent);
        document.title = nextDoc.title;

        if (!options || options.push !== false) {
          window.history.pushState({}, "", url);
        }

        setupActiveNav();
        window.scrollTo(0, 0);
      });
  }

  function setupInternalNavigation() {
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var link = event.target.closest ? event.target.closest("a") : null;
      if (!link || !isInternalPageLink(link)) return;

      event.preventDefault();
      var targetPage = pageFromUrl(link.href);

      if (targetPage === "setup.html") {
        sessionSet(INTERNAL_NAVIGATION_KEY, "true");
      } else {
        sessionRemove(INTERNAL_NAVIGATION_KEY);
      }

      navigateInternally(link.href)
        .then(function () {
          if (targetPage === "setup.html") {
            sessionRemove(INTERNAL_NAVIGATION_KEY);
          }
        }, function () {
          window.location.href = link.href;
        });
    });

    window.addEventListener("popstate", function () {
      navigateInternally(window.location.href, { push: false }).then(null, function () {
        window.location.reload();
      });
    });
  }

  ensureHomeEntryPage();
  setupActiveNav();
  setupParticles();
  setupAudioButtons();
  setupIntroGate();
  setupCustomCursor();
  setupContextMenuBlock();
  setupInternalNavigation();
})();
