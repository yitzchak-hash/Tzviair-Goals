/*
 * TzviAir Goals widget embed script.
 *
 * Drop-in usage from any other site (e.g. the TzviAir Job Manager):
 *
 *   <script src="https://tzviair-goals.vercel.app/widget.js" async
 *           data-tzviair-goals-widget
 *           data-view="dashboard"
 *           data-lang="he"></script>
 *
 * The script tag is replaced by an auto-resizing iframe of /widget.
 *
 * Programmatic usage (board tiles, dashboards, SPAs):
 *
 *   var handle = TzviAirGoalsWidget.mount("#goals-slot", {
 *     view: "board",        // "board" | "dashboard"
 *     lang: "he",           // "he" | "en"
 *     interactive: true,    // show start/finish buttons (default false)
 *     max: 6,               // cap the number of tiles (default: all)
 *     transparent: true,    // transparent widget background
 *     header: false,        // hide the logo/header row
 *     link: false,          // hide the "open the full board" link
 *     onState: function (state) {
 *       // { total, completed, inProgress, notStarted }
 *     },
 *   });
 *   handle.destroy();
 *
 * All data stays in the goals app's own Vercel Blob storage; the host page
 * only embeds the iframe and never needs credentials.
 */
(function () {
  "use strict";

  var MESSAGE_SOURCE = "tzviair-goals-widget";
  var scriptEl =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  function baseOrigin() {
    var src = (scriptEl && scriptEl.src) || "";
    try {
      return new URL(src).origin;
    } catch {
      return "https://tzviair-goals.vercel.app";
    }
  }

  function widgetUrl(options) {
    var origin = (options && options.origin) || baseOrigin();
    var params = [];
    if (options) {
      if (options.view === "dashboard") params.push("view=dashboard");
      if (options.lang === "en") params.push("lang=en");
      if (options.interactive) params.push("interactive=1");
      if (options.max > 0) params.push("max=" + Math.floor(options.max));
      if (options.transparent) params.push("theme=transparent");
      if (options.header === false) params.push("title=0");
      if (options.link === false) params.push("link=0");
      if (options.cloudTest) params.push("cloud-test=1");
    }
    return origin + "/widget" + (params.length ? "?" + params.join("&") : "");
  }

  function mount(target, options) {
    options = options || {};
    var container =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!container) {
      throw new Error("TzviAirGoalsWidget: mount target not found.");
    }

    var url = widgetUrl(options);
    var expectedOrigin = new URL(url).origin;

    var fixedHeight =
      options.height !== undefined && options.height !== "auto"
        ? parseInt(options.height, 10)
        : null;

    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = options.title || "TzviAir Goals";
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.height = (fixedHeight || 220) + "px";
    iframe.setAttribute("allowtransparency", "true");

    function onMessage(event) {
      if (event.origin !== expectedOrigin) return;
      if (event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || data.source !== MESSAGE_SOURCE) return;

      if (data.type === "resize" && typeof data.height === "number") {
        // "auto" tracks the widget's own height; a fixed height stays put.
        if (fixedHeight === null) {
          iframe.style.height = Math.max(60, data.height) + "px";
        }
      }
      if (data.type === "state" && typeof options.onState === "function") {
        options.onState({
          total: data.total,
          completed: data.completed,
          inProgress: data.inProgress,
          notStarted: data.notStarted,
        });
      }
    }

    window.addEventListener("message", onMessage);
    container.appendChild(iframe);

    return {
      iframe: iframe,
      destroy: function () {
        window.removeEventListener("message", onMessage);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      },
    };
  }

  window.TzviAirGoalsWidget = window.TzviAirGoalsWidget || { mount: mount };

  // Declarative auto-mount: replace the script tag with the widget iframe.
  if (scriptEl && scriptEl.hasAttribute("data-tzviair-goals-widget")) {
    var ds = scriptEl.dataset || {};
    var holder = document.createElement("div");
    holder.className = "tzviair-goals-widget";
    scriptEl.parentNode.insertBefore(holder, scriptEl);
    mount(holder, {
      view: ds.view,
      lang: ds.lang,
      interactive: ds.interactive === "1" || ds.interactive === "true",
      max: parseInt(ds.max || "0", 10) || 0,
      transparent: ds.transparent === "1" || ds.transparent === "true",
      header: ds.header === "0" || ds.header === "false" ? false : true,
      link: ds.link === "0" || ds.link === "false" ? false : true,
      height: ds.height === undefined ? "auto" : ds.height,
    });
  }
})();
