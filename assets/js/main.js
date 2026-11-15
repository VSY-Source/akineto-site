/* ========================================================================== 
   AKINETO / SIGNAL 0719
   Navigation, transitions, real-audio waveforms and accessible interactions
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  root.classList.remove("no-js");
  root.classList.add("js");

  /* Theme ----------------------------------------------------------------- */
  var THEME_KEY = "uta-theme";
  var themeToggle = document.querySelector(".theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function updateThemeUI() {
    var dark = currentTheme() === "dark";
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.setAttribute("aria-label", dark ? "切换至浅色主题" : "切换至深色主题");
      var label = themeToggle.querySelector(".theme-toggle__label");
      if (label) label.textContent = dark ? "DARK" : "LIGHT";
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#080a0f" : "#edf1ee");
  }

  if (themeToggle) {
    if (!themeToggle.querySelector(".theme-toggle__label")) {
      var themeLabel = document.createElement("span");
      themeLabel.className = "theme-toggle__label";
      themeToggle.appendChild(themeLabel);
    }
    themeToggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* Storage may be unavailable. */ }
      updateThemeUI();
    });
  }
  updateThemeUI();

  /* Header, navigation labels and reading progress ------------------------ */
  var header = document.querySelector(".site-header");
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.appendChild(document.createElement("span"));
  body.appendChild(progress);
  var progressBar = progress.firstChild;
  var scrollQueued = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progressBar.style.transform = "scaleX(" + Math.min(1, y / max) + ")";
    scrollQueued = false;
  }
  window.addEventListener("scroll", function () {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  window.addEventListener("resize", updateScrollUI, { passive: true });
  updateScrollUI();

  var page = body.getAttribute("data-page") || "home";
  var pageNames = {
    home: ["HOME", "首页"],
    character: ["CHARACTER", "角色档案"],
    voicebank: ["VOICEBANK", "声库规格"],
    download: ["DOWNLOAD", "声库下载"],
    news: ["NEWS", "更新记录"],
    guide: ["GUIDE", "教程与 FAQ"],
    terms: ["TERMS", "使用条款"],
    credits: ["CREDITS", "制作名单"]
  };

  document.querySelectorAll(".nav__link").forEach(function (link) {
    var key = link.getAttribute("data-page");
    var info = pageNames[key];
    if (info) {
      var zh = document.createElement("span");
      zh.className = "nav__zh";
      zh.textContent = link.textContent.trim();
      var en = document.createElement("span");
      en.className = "nav__en";
      en.textContent = info[0];
      link.replaceChildren(zh, en);
    }
    if (key === page) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    }
  });

  /* Full-screen site index ------------------------------------------------- */
  var menu = document.createElement("dialog");
  menu.className = "site-menu";
  menu.id = "site-menu";
  menu.setAttribute("aria-label", "全站导航");

  var menuLinks = [
    ["home", "index.html"],
    ["character", "character.html"],
    ["voicebank", "voicebank.html"],
    ["download", "download.html"],
    ["news", "news.html"],
    ["guide", "guide.html"],
    ["terms", "terms.html"],
    ["credits", "credits.html"]
  ];
  var menuHTML = '<div class="site-menu__top"><span class="site-menu__logo">AKINETO<span>SITE INDEX / 0719</span></span>' +
    '<button class="site-menu__close" type="button" aria-label="关闭全站导航">CLOSE <b>×</b></button></div>' +
    '<div class="site-menu__shell"><div><p class="site-menu__heading">SELECT DESTINATION / 选择要前往的页面</p><nav aria-label="全站页面"><ul class="site-menu__list">';
  menuLinks.forEach(function (item) {
    var info = pageNames[item[0]];
    menuHTML += '<li><a class="site-menu__link" data-page="' + item[0] + '" href="' + item[1] + '"' + (item[0] === page ? ' aria-current="page"' : '') + '>' +
      '<span class="site-menu__name">' + info[0] + '</span><span class="site-menu__desc">' + info[1] + '</span><span class="site-menu__arrow" aria-hidden="true">↗</span></a></li>';
  });
  menuHTML += '</ul></nav><p class="site-menu__foot">UTAU VOICE LIBRARY / MINT COLORED VOICE<br>© 2026 AKINETO</p></div>' +
    '<div class="site-menu__aside" aria-hidden="true"><span class="site-menu__aside-word">INDEX</span>' +
    '<img src="assets/art/akineto-alt.webp" alt="" width="1682" height="2492">' +
    '<div class="site-menu__aside-meta"><span>CHARACTER FILE / 02</span><span>#45CFC9</span></div></div></div>';
  menu.innerHTML = menuHTML;
  body.appendChild(menu);

  var navToggle = document.querySelector(".nav-toggle");
  var headerInner = document.querySelector(".header-inner");
  var menuToggle = document.createElement("button");
  menuToggle.className = "menu-toggle";
  menuToggle.type = "button";
  menuToggle.setAttribute("aria-label", "打开全站导航");
  menuToggle.setAttribute("aria-controls", "site-menu");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.innerHTML = '<span>INDEX</span><b aria-hidden="true">+</b>';
  if (headerInner && themeToggle) headerInner.insertBefore(menuToggle, themeToggle);
  else if (headerInner) headerInner.appendChild(menuToggle);

  function setMenuButtons(open) {
    [navToggle, menuToggle].forEach(function (button) {
      if (!button) return;
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "关闭全站导航" : "打开全站导航");
      if (button === navToggle) button.setAttribute("aria-controls", "site-menu");
    });
  }

  function openMenu() {
    setMenuButtons(true);
    body.classList.add("menu-open");
    if (typeof menu.showModal === "function") {
      if (!menu.open) menu.showModal();
    } else {
      menu.setAttribute("open", "");
    }
  }

  function closeMenu() {
    if (typeof menu.close === "function" && menu.open) menu.close();
    else menu.removeAttribute("open");
    body.classList.remove("menu-open");
    setMenuButtons(false);
  }

  [navToggle, menuToggle].forEach(function (button) {
    if (button) button.addEventListener("click", function () {
      if (menu.open) closeMenu(); else openMenu();
    });
  });
  var menuClose = menu.querySelector(".site-menu__close");
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  menu.addEventListener("close", function () {
    body.classList.remove("menu-open");
    setMenuButtons(false);
  });
  menu.addEventListener("click", function (event) {
    if (event.target === menu) closeMenu();
    if (event.target.closest("a")) closeMenu();
  });

  /* Internal page transitions --------------------------------------------- */
  var transition = document.createElement("div");
  transition.className = "page-transition";
  transition.setAttribute("aria-hidden", "true");
  transition.innerHTML = '<div class="page-transition__inner"><div class="page-transition__brand">AKINETO<small>SIGNAL / 0719</small></div>' +
    '<div class="page-transition__line"><i></i></div><p class="page-transition__label" data-transition-label>LOADING NEXT SIGNAL...</p></div>';
  body.appendChild(transition);
  var transitionLabel = transition.querySelector("[data-transition-label]");
  var navigating = false;

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link || navigating || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target || link.hasAttribute("download") || link.getAttribute("aria-disabled") === "true") return;
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;

    var url;
    try { url = new URL(link.href, window.location.href); } catch (error) { return; }
    var localFile = url.protocol === "file:" && window.location.protocol === "file:";
    if (!localFile && url.origin !== window.location.origin) return;
    if (!/\.html?$/i.test(url.pathname)) return;
    if (url.pathname === window.location.pathname && url.hash) return;
    if (url.href === window.location.href) return;

    event.preventDefault();
    navigating = true;
    var key = link.getAttribute("data-page");
    transitionLabel.textContent = "OPENING / " + (pageNames[key] ? pageNames[key][0] : (link.textContent.trim() || "NEXT PAGE")).toUpperCase();
    if (reducedMotion.matches) {
      window.location.href = link.href;
      return;
    }
    root.classList.add("is-transitioning");
    window.setTimeout(function () { window.location.href = link.href; }, 420);
  });
  window.addEventListener("pageshow", function () {
    navigating = false;
    root.classList.remove("is-transitioning");
    closeMenu();
  });

  /* Download gates --------------------------------------------------------- */
  document.querySelectorAll("[data-download-card]").forEach(function (card) {
    var check = card.querySelector("[data-gate]");
    var button = card.querySelector("[data-download-btn]");
    var gate = card.querySelector(".gate");
    var hint = card.querySelector(".gate__hint");
    if (!check || !button) return;

    function apply(enabled) {
      button.setAttribute("aria-disabled", String(!enabled));
      button.classList.toggle("is-disabled", !enabled);
      if (button.tagName === "BUTTON") button.disabled = !enabled;
      else if (enabled) button.removeAttribute("tabindex");
      else button.setAttribute("tabindex", "-1");
      if (gate) gate.classList.toggle("is-open", enabled);
      if (hint) hint.textContent = enabled ? "ACCESS GRANTED / 可以下载" : "READ + AGREE / 勾选后前往";
    }
    check.addEventListener("change", function () { apply(check.checked); });
    apply(check.checked);
  });

  /* Copy buttons ----------------------------------------------------------- */
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.getAttribute("data-copy");
      var original = button.innerHTML;
      var timer;
      function feedback(success) {
        window.clearTimeout(timer);
        button.textContent = success ? "已复制 / COPIED" : "请手动复制 " + value;
        timer = window.setTimeout(function () { button.innerHTML = original; }, 1800);
      }
      function fallback() {
        var area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        body.appendChild(area);
        area.select();
        var success = false;
        try { success = document.execCommand("copy"); } catch (error) { success = false; }
        area.remove();
        feedback(success);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () { feedback(true); }, fallback);
      } else fallback();
    });
  });

  /* Real waveform data, measured from the bundled WAV files ---------------- */
  /* AUDIO_PEAKS_START */
  var AUDIO_PEAKS = {
    "demo-01": [0.389,0.57,0.483,0.538,0.536,0.511,0.501,0.474,0.529,0.548,0.59,0.548,0.495,0.391,0.717,0.522,0.535,0.559,0.525,0.556,0.51,0.521,0.511,0.525,0.493,0.433,0.568,0.606,0.515,0.489,0.624,0.549,0.427,0.452,0.537,0.571,0.561,0.548,0.67,0.476,0.501,0.522,0.42,0.501,0.495,0.475,0.522,0.551,0.51,0.538,0.473,0.491,0.513,0.452,0.544,0.552],
    "demo-02": [0.498,0.506,0.497,0.512,0.61,0.436,0.558,0.608,0.486,0.608,0.444,0.495,0.608,0.476,0.469,0.487,0.485,0.488,0.461,0.508,0.451,0.504,0.471,0.461,0.504,0.451,0.438,0.487,0.481,0.458,0.487,0.519,0.481,0.587,0.537,0.512,0.43,0.477,0.512,0.507,0.475,0.411,0.473,0.543,0.522,0.499,0.484,0.497,0.553,0.449,0.441,0.47,0.468,0.473,0.466,0.464]
  };
  /* AUDIO_PEAKS_END */
  var tracks = Array.prototype.slice.call(document.querySelectorAll("[data-track]"));
  var playerStatus = document.querySelector("[data-player-status]");

  function formatTime(value) {
    if (!isFinite(value) || value < 0) return "--:--";
    var minutes = Math.floor(value / 60);
    var seconds = Math.floor(value % 60);
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  tracks.forEach(function (track, trackIndex) {
    var audio = track.querySelector("audio");
    var play = track.querySelector(".track__play");
    var wave = track.querySelector("[data-wave]");
    var seek = track.querySelector("[data-seek]");
    var current = track.querySelector("[data-current]");
    var duration = track.querySelector("[data-duration]");
    if (!audio || !play || !wave || !seek) return;

    var match = audio.getAttribute("src").match(/(demo-\d+)/);
    var peaks = match && AUDIO_PEAKS[match[1]] ? AUDIO_PEAKS[match[1]] : new Array(56).fill(0.08);
    var bars = peaks.map(function (peak) {
      var bar = document.createElement("i");
      bar.style.setProperty("--h", Math.max(3, Math.round(peak * 100)));
      wave.appendChild(bar);
      return bar;
    });
    track.classList.add("is-enhanced");
    audio.removeAttribute("controls");
    audio.preload = "metadata";
    var heading = track.querySelector(".track__heading h3");
    var trackName = heading ? heading.textContent.trim() : "Demo 0" + (trackIndex + 1);

    function renderProgress() {
      var length = audio.duration;
      var ratio = isFinite(length) && length > 0 ? audio.currentTime / length : 0;
      current.textContent = formatTime(audio.currentTime);
      duration.textContent = formatTime(length);
      if (!seek.matches(":active")) seek.value = String(Math.round(ratio * 1000));
      bars.forEach(function (bar, index) {
        bar.classList.toggle("is-past", index / bars.length <= ratio);
      });
    }

    function setPlaying(playing) {
      track.classList.toggle("is-playing", playing);
      play.setAttribute("aria-pressed", String(playing));
      play.setAttribute("aria-label", (playing ? "暂停" : "播放") + trackName);
      if (playerStatus) playerStatus.textContent = playing ? "PLAYING / 0" + (trackIndex + 1) : "READY";
    }

    play.addEventListener("click", function () {
      if (!audio.paused) {
        audio.pause();
        return;
      }
      tracks.forEach(function (otherTrack) {
        var other = otherTrack.querySelector("audio");
        if (other && other !== audio && !other.paused) other.pause();
      });
      var promise = audio.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(function () {
          setPlaying(false);
          if (playerStatus) playerStatus.textContent = "PLAYBACK ERROR";
        });
      }
    });
    audio.addEventListener("play", function () { setPlaying(true); });
    audio.addEventListener("pause", function () { setPlaying(false); });
    audio.addEventListener("ended", function () {
      setPlaying(false);
      if (playerStatus) playerStatus.textContent = "END / 0" + (trackIndex + 1);
    });
    audio.addEventListener("timeupdate", renderProgress);
    audio.addEventListener("loadedmetadata", renderProgress);
    audio.addEventListener("durationchange", renderProgress);
    seek.addEventListener("input", function () {
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Number(seek.value) / 1000 * audio.duration;
        renderProgress();
      }
    });
    renderProgress();
  });

  /* Pause any native audio players when another one starts ----------------- */
  var allAudio = Array.prototype.slice.call(document.querySelectorAll("audio"));
  allAudio.forEach(function (audio) {
    audio.addEventListener("play", function () {
      allAudio.forEach(function (other) {
        if (other !== audio && !other.paused) other.pause();
      });
    });
  });

  /* Character form switch -------------------------------------------------- */
  var artVisual = document.querySelector("[data-art-visual]");
  if (artVisual) {
    var artLabel = artVisual.querySelector("[data-art-label]");
    var artImages = Array.prototype.slice.call(artVisual.querySelectorAll("[data-art]"));
    var artButtons = Array.prototype.slice.call(artVisual.querySelectorAll("[data-art-switch]"));
    artButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var target = button.getAttribute("data-art-switch");
        artImages.forEach(function (image) { image.classList.toggle("is-active", image.getAttribute("data-art") === target); });
        artButtons.forEach(function (other) {
          var active = other === button;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-pressed", String(active));
        });
        if (artLabel) artLabel.textContent = target === "alt" ? "02 / ALTERNATIVE" : "01 / STANDARD";
        artVisual.setAttribute("data-active-art", target);
      });
    });

    if (window.matchMedia("(pointer: fine)").matches && !reducedMotion.matches) {
      artVisual.addEventListener("pointermove", function (event) {
        var rect = artVisual.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width - .5) * 12;
        var y = ((event.clientY - rect.top) / rect.height - .5) * 8;
        artVisual.style.setProperty("--px", x.toFixed(2) + "px");
        artVisual.style.setProperty("--py", y.toFixed(2) + "px");
      });
      artVisual.addEventListener("pointerleave", function () {
        artVisual.style.setProperty("--px", "0px");
        artVisual.style.setProperty("--py", "0px");
      });
    }
  }

  /* Ambient hero signal canvas; paused offscreen and for reduced motion ---- */
  var canvas = document.querySelector("[data-signal-canvas]");
  if (canvas && canvas.getContext) {
    var context = canvas.getContext("2d");
    var canvasParent = canvas.parentElement;
    var width = 0;
    var height = 0;
    var frame = null;
    var running = true;
    var start = performance.now();

    function resizeCanvas() {
      var rect = canvasParent.getBoundingClientRect();
      var ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawSignal(performance.now());
    }

    function drawSignal(now) {
      context.clearRect(0, 0, width, height);
      var time = reducedMotion.matches ? 0 : (now - start) / 1000;
      var colors = ["98,239,210", "165,140,240", "98,239,210"];
      for (var line = 0; line < 3; line++) {
        context.beginPath();
        for (var x = 0; x <= width; x += 3) {
          var normalized = x / Math.max(1, width);
          var envelope = Math.sin(normalized * Math.PI);
          var y = height * (.42 + line * .1) + Math.sin(normalized * 15 + time * (.65 + line * .16) + line) * (18 + line * 6) * envelope + Math.sin(normalized * 43 - time * .42) * 5 * envelope;
          if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.strokeStyle = "rgba(" + colors[line] + "," + (line === 0 ? .42 : .2) + ")";
        context.lineWidth = line === 0 ? 1.1 : .7;
        context.stroke();
      }
      var scanX = ((time * 24) % (width + 120)) - 60;
      var gradient = context.createLinearGradient(scanX - 45, 0, scanX + 45, 0);
      gradient.addColorStop(0, "rgba(98,239,210,0)");
      gradient.addColorStop(.5, "rgba(98,239,210,.07)");
      gradient.addColorStop(1, "rgba(98,239,210,0)");
      context.fillStyle = gradient;
      context.fillRect(scanX - 45, 0, 90, height);
    }

    function animateSignal(now) {
      frame = null;
      if (!running || reducedMotion.matches || document.hidden) return;
      drawSignal(now);
      frame = window.requestAnimationFrame(animateSignal);
    }
    function updateSignalState() {
      if (running && !document.hidden && !reducedMotion.matches && frame === null) frame = window.requestAnimationFrame(animateSignal);
      if ((!running || document.hidden) && frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }
    if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(canvasParent);
    else window.addEventListener("resize", resizeCanvas);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
        updateSignalState();
      }, { threshold: 0 }).observe(canvasParent);
    }
    document.addEventListener("visibilitychange", updateSignalState);
    resizeCanvas();
    updateSignalState();
  }

  /* Artwork lightbox -------------------------------------------------------- */
  var zoomTargets = document.querySelectorAll(".art-card__frame, .char-visual");
  if (zoomTargets.length) {
    var lightbox = document.createElement("dialog");
    lightbox.className = "lightbox";
    lightbox.setAttribute("aria-label", "放大立绘");
    lightbox.innerHTML = '<button class="lightbox__close" type="button">CLOSE ×</button><div class="lightbox__inner"><img alt=""></div><p class="lightbox__caption"></p>';
    body.appendChild(lightbox);
    var lightboxImage = lightbox.querySelector("img");
    var lightboxCaption = lightbox.querySelector(".lightbox__caption");
    lightbox.querySelector(".lightbox__close").addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (event) { if (event.target === lightbox || event.target.classList.contains("lightbox__inner")) lightbox.close(); });

    zoomTargets.forEach(function (target) {
      target.classList.add("js-zoom");
      target.setAttribute("tabindex", "0");
      target.setAttribute("role", "button");
      target.setAttribute("aria-label", "放大查看角色立绘");
      function openLightbox() {
        var image = target.querySelector("img");
        if (!image) return;
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;
        var figure = target.closest("figure");
        var caption = figure ? figure.querySelector("figcaption") : null;
        lightboxCaption.textContent = caption ? caption.textContent : image.alt;
        lightbox.showModal();
      }
      target.addEventListener("click", openLightbox);
      target.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox();
        }
      });
    });
  }

  /* Keep the FAQ compact --------------------------------------------------- */
  var faqItems = document.querySelectorAll(".faq__item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* Scroll reveals ---------------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (!reducedMotion.matches && "IntersectionObserver" in window && reveals.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal--in");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: .07 });
    reveals.forEach(function (element) {
      element.classList.add("reveal--armed");
      revealObserver.observe(element);
    });
  }

  /* Inner-page display titles and current year ----------------------------- */
  document.querySelectorAll(".page-head").forEach(function (head) {
    var breadcrumb = head.querySelector(".breadcrumb");
    if (breadcrumb) {
      var parts = breadcrumb.textContent.split("/");
      head.setAttribute("data-page-title", parts[parts.length - 1].trim());
    }
  });
  document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });
})();
