/* ============================================================
   SELCOUTH PDP — "مختارة لك" second section. Fetches the CURRENT product's
   category and builds the reference .col-card grid (same styling as the
   collection page), excluding the current product.
   ============================================================ */
(function () {
  var grid = document.getElementById("rec-grid");
  if (!grid) return;
  var cat = grid.getAttribute("data-category");
  function hide() { var s = grid.closest(".rec"); if (s) s.hidden = true; }
  if (!cat || cat === "" || !window.salla || !salla.product || !salla.product.fetch) { hide(); return; }

  function money(v) { try { if (salla.money) return salla.money(v); } catch (e) {} return v + " ر.س"; }
  function priceNum(p) { return (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price; }
  function imgOf(p) { return (p.image && p.image.url) || p.thumbnail || (p.images && p.images[0] && p.images[0].url) || ""; }
  function esc(s) { return String(s || "").replace(/"/g, "&quot;"); }

  salla.product
    .fetch({ source: "categories", source_value: [Number(cat)], per_page: 12 })
    .then(function (res) {
      var products = (res && (res.data || res.products || res)) || [];
      if (!Array.isArray(products)) products = products.data || [];
      products = products.filter(function (p) { return String(p.id) !== String(window.MP_PRODUCT_ID); });
      if (!products.length) { hide(); return; }
      products.slice(0, 6).forEach(function (p, i) {
        var li = document.createElement("li");
        li.innerHTML =
          '<a class="col-card" href="' + esc(p.url || "#") + '" style="--d: ' + (i * 0.09).toFixed(2) + 's">' +
            '<div class="col-media"><img class="col-bottle" src="' + esc(imgOf(p)) + '" alt="' + esc(p.name) + '" decoding="async" /></div>' +
            '<div class="col-body">' +
              '<h3 class="col-name">' + (p.name || "") + '</h3>' +
              (p.subtitle ? '<p class="col-desc">' + p.subtitle + '</p>' : '') +
              '<p class="col-price">' + money(priceNum(p)) + '</p>' +
              '<span class="col-cta">عرض المنتج</span>' +
            '</div>' +
          '</a>';
        grid.appendChild(li);
      });
      // let the reveal (if any) kick in
      grid.classList.add("is-in");
    })
    .catch(hide);
})();
