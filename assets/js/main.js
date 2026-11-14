/* =========================================================
   星野歌 / Hoshino Uta — 声库配布站
   main.js — 无依赖的小脚本
   1. 主题切换  2. 导航  3. 下载门禁  4. 复制  5. 动效
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");

  /* ---------- 主题切换 ---------- */
  var THEME_KEY = "uta-theme";
  var themeToggle = document.querySelector(".theme-toggle");
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function preferredTheme() {
    return root.getAttribute("data-theme") || (media.matches ? "dark" : "light");
  }

  function applyThemeLabel() {
    if (!themeToggle) return;
    var isDark = preferredTheme() === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "切换至浅色主题" : "切换至深色主题");
  }

  if (themeToggle) {
    applyThemeLabel();
    themeToggle.addEventListener("click", function () {
      var next = preferredTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 无法写入存储时也继续运行 */ }
      applyThemeLabel();
    });
    // 系统主题变化时，如果用户没有手动指定，只更新按钮文案
    media.addEventListener("change", function () {
      if (!root.getAttribute("data-theme")) applyThemeLabel();
    });
  }

  /* ---------- 顶栏阴影 ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 移动端导航 ---------- */
  var nav = document.getElementById("site-nav");
  var navToggle = document.querySelector(".nav-toggle");

  function setNav(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  }

  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        navToggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 880) setNav(false);
    });
  }

  /* ---------- 在导航中高亮当前页 ---------- */
  var page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll(".nav__link").forEach(function (link) {
      if (link.getAttribute("data-page") === page) {
        link.classList.add("is-current");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- 下载前同意门禁 ---------- */
  document.querySelectorAll("[data-download-card]").forEach(function (card) {
    var check = card.querySelector("[data-gate]");
    var button = card.querySelector("[data-download-btn]");
    if (!check || !button) return;

    var apply = function (enabled) {
      button.setAttribute("aria-disabled", String(!enabled));
      button.classList.toggle("is-disabled", !enabled);
      if (button.tagName === "BUTTON") {
        button.disabled = !enabled;
      } else if (enabled) {
        button.removeAttribute("tabindex");
      } else {
        button.setAttribute("tabindex", "-1");
      }
    };

    check.addEventListener("change", function () { apply(check.checked); });
    apply(check.checked);
  });

  /* ---------- 复制 SHA-256 ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.getAttribute("data-copy");
      var label = button.textContent;
      var done = function () {
        button.textContent = "已复制";
        window.setTimeout(function () { button.textContent = label; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, done);
      } else {
        // 旧浏览器降级方案
        var area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); } catch (e) { /* 失败时忽略 */ }
        document.body.removeChild(area);
        done();
      }
    });
  });

  /* ---------- 防止多首试听同时播放 ---------- */
  var audios = Array.prototype.slice.call(document.querySelectorAll("audio"));
  audios.forEach(function (audio) {
    audio.addEventListener("play", function () {
      audios.forEach(function (other) {
        if (other !== audio && !other.paused) other.pause();
      });
    });
  });

  /* ---------- 滚动出现动画 ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
  if (!reduced && "IntersectionObserver" in window && targets.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal--in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(function (el) {
      el.classList.add("reveal--armed");
      observer.observe(el);
    });
  }

  /* ---------- 页脚年份 ---------- */
  var year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = year;
  });
})();
