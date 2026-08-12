/* ============================================================
   SELCOUTH COLLECTION / CATEGORY PAGE.
   Builds the reference .col-card grid (identical to the PDP "يتناغم مع"
   section) from the current category's products.
   Category id resolution order: #col-grid[data-category] → the "/c<id>" in
   the URL (always present on Salla category pages) → give up → native list.
   Only a genuine fetch failure reveals the native <salla-products-list>.
   ============================================================ */
(function () {
  var grid = document.getElementById("col-grid");
  if (!grid) return;
  var emptyEl = document.getElementById("col-empty");
  var fallback = document.getElementById("col-fallback");

  function showFallback() {
    if (grid) grid.hidden = true;
    if (emptyEl) emptyEl.hidden = true;
    if (fallback) fallback.hidden = false;
  }
  function showEmpty() {
    if (grid) grid.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
  }

  // resolve the category id — data attr first, then the /c<id> in the URL
  var cat = grid.getAttribute("data-category");
  if (!cat || cat === "" || cat === "0") {
    var m = (location.pathname + location.search).match(/\/c(\d+)/) || location.href.match(/[?&]category=(\d+)/);
    if (m) cat = m[1];
  }

  if (!cat || !window.salla || !salla.product || !salla.product.fetch) { showFallback(); return; }

  function selL(ar, en) { return window.SelLang === "ar" ? ar : en; }
  function selCur() {
    var c = window.SEL_CURRENCY || "";
    try { if (!c && window.salla && salla.config && salla.config.get) c = salla.config.get("user.currency_code") || ""; } catch (e) {}
    var ar = window.SelLang === "ar";
    var M = { SAR: ar ? "ر.س" : "SAR", USD: "$", EUR: "€", GBP: "£", AED: ar ? "د.إ" : "AED",
      KWD: ar ? "د.ك" : "KWD", BHD: ar ? "د.ب" : "BHD", QAR: ar ? "ر.ق" : "QAR",
      OMR: ar ? "ر.ع" : "OMR", EGP: ar ? "ج.م" : "EGP", JOD: ar ? "د.أ" : "JOD" };
    return M[c] || c || (ar ? "ر.س" : "SAR");
  }
  // Active-currency symbol (not a fixed ر.س). Values from the API are already
  // converted to the shopper's currency, so we only format + append the symbol.
  function money(v) {
    if (v == null || v === "") return "";
    var n = (typeof v === "number") ? v : parseFloat(v);
    if (isNaN(n)) return v + " " + selCur();
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) + " " + selCur();
  }
  function priceNum(p) { return (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price; }
  function imgOf(p) { return (p.image && p.image.url) || p.thumbnail || (p.images && p.images[0] && p.images[0].url) || ""; }
  function esc(s) { return String(s || "").replace(/"/g, "&quot;"); }

  salla.product
    .fetch({ source: "categories", source_value: [Number(cat)], per_page: 50 })
    .then(function (res) {
      var products = (res && (res.data || res.products || res)) || [];
      if (!Array.isArray(products)) products = products.data || [];
      if (!products.length) { showEmpty(); return; }
      var html = "";
      products.forEach(function (p, i) {
        html +=
          '<li><a class="col-card" href="' + esc(p.url || "#") + '" style="--d: ' + ((i % 5) * 0.07).toFixed(2) + 's">' +
            '<div class="col-media"><img class="col-bottle" src="' + esc(imgOf(p)) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" /></div>' +
            '<div class="col-body">' +
              '<h3 class="col-name">' + (p.name || "") + '</h3>' +
              (p.subtitle ? '<p class="col-desc">' + p.subtitle + '</p>' : '') +
              '<p class="col-price">' + money(priceNum(p)) + '</p>' +
              '<span class="col-cta">' + selL("عرض المنتج", "View product") + '</span>' +
            '</div>' +
          '</a></li>';
      });
      grid.innerHTML = html;
      grid.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      if (fallback) fallback.hidden = true;
      requestAnimationFrame(function () { grid.classList.add("is-in"); });
    })
    .catch(showFallback);
})();
