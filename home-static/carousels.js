/* ============================================================
   SELCOUTH — fill the bespoke 3D perfume/sample carousels with LIVE
   category products. Each .pf-carousel[data-category] fetches its
   category via the Salla SDK, builds .pf-card elements (linking to the
   real product.url), injects them, then re-inits the carousel through
   the SelFillCarousel hook exposed by home.js.
   ============================================================ */
(function () {
  function priceText(p) {
    var v = (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price;
    if (v == null) return "";
    // Plain string only — salla.money() returns HTML (an <i class="sicon-sar">
    // icon) and home.js sets the price via textContent, so it would leak as
    // literal markup. Format the number ourselves and use "ر.س".
    var n = (typeof v === "number") ? v : parseFloat(v);
    if (isNaN(n)) return v + " ر.س";
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) + " ر.س";
  }
  function imgOf(p) {
    if (p.image && p.image.url) return p.image.url;
    if (typeof p.image === "string") return p.image;
    if (p.thumbnail) return p.thumbnail;
    if (p.images && p.images[0]) return p.images[0].url || p.images[0];
    return "";
  }
  function buildCard(p, i) {
    var name = p.name || "";
    var desc = p.subtitle || p.promotion_title || "";
    var price = priceText(p);
    var card = document.createElement("div");
    card.className = "pf-card";
    card.setAttribute("data-i", i);
    card.setAttribute("data-id", p.id != null ? p.id : "");
    card.setAttribute("data-status", p.status || "");
    card.setAttribute("data-href", p.url || "#");
    card.setAttribute("data-name-ar", name);
    card.setAttribute("data-desc-ar", desc);
    card.setAttribute("data-price-ar", price);
    card.setAttribute("data-desc", desc);
    card.setAttribute("data-price", price);
    card.innerHTML =
      '<div class="pf-media"><img class="pf-bottle" src="' + imgOf(p) +
      '" alt="' + name + '" loading="lazy" decoding="async" /></div>' +
      '<div class="pf-name">' + name + "</div>";
    return card;
  }
  function extractProducts(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.products)) return res.data.products;
    if (Array.isArray(res.products)) return res.products;
    return [];
  }
  function fill(root) {
    var cat = root.getAttribute("data-category");
    if (!cat || !window.salla || !salla.product || !salla.product.fetch) return;
    salla.product
      .fetch({ source: "categories", source_value: [Number(cat)], per_page: 12 })
      .then(function (res) {
        var products = extractProducts(res);
        var stage = root.querySelector(".pf-stage");
        if (!stage || !products.length) return;
        stage.innerHTML = "";
        products.forEach(function (p, i) { stage.appendChild(buildCard(p, i)); });
        if (window.SelFillCarousel) window.SelFillCarousel(root);
        wireShop(root);
      })
      .catch(function (e) {
        if (window.console) console.warn("[selcouth] carousel fetch failed for category " + cat, e);
      });
  }
  // Wire the carousel's "أضف إلى السلة" button to the CENTERED product
  // (home.js flags it with .pf-card.is-active). Add it to the real Salla cart.
  function wireShop(root) {
    var shop = root.querySelector(".pf-shop");
    if (!shop || shop._selWired) return;
    shop._selWired = true;
    shop.addEventListener("click", function () {
      var active = root.querySelector(".pf-card.is-active") || root.querySelector(".pf-card");
      if (!active) return;
      var id = active.getAttribute("data-id");
      if (!id || !window.salla || !salla.cart) return;
      var txt = shop.querySelector(".pf-shop__txt");
      var restore = txt ? txt.textContent : "";
      salla.cart.addItem({ id: Number(id), quantity: 1 })
        .then(function () { if (txt) { txt.textContent = "أُضيف ✓"; setTimeout(function () { txt.textContent = restore; }, 1500); } })
        .catch(function () {});
    });
  }

  function run() {
    Array.prototype.slice
      .call(document.querySelectorAll(".pf-carousel[data-category]"))
      .forEach(fill);
  }
  if (window.salla && salla.onReady) salla.onReady(run);
  else document.addEventListener("DOMContentLoaded", run);
})();
