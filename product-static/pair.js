/* ============================================================
   SELCOUTH PDP — "أضِفه إلى" cross-sell block.
   Fetches the samples category, builds the reference checkbox rows
   (thumb · name · price · quantity), and — when the main "أضف إلى السلة"
   button is clicked — adds every ticked sample to the cart too.
   Auto-fills on every perfume page; no per-product setup.
   ============================================================ */
(function () {
  var wrap = document.querySelector(".mp-pair[data-category]");
  if (!wrap) return;
  var list = wrap.querySelector(".mp-pair__list");
  var cat = wrap.getAttribute("data-category");
  if (!list || !cat || !window.salla || !salla.product || !salla.product.fetch) { wrap.hidden = true; return; }

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
  function money(v) {
    if (v == null || v === "") return "";
    var n = (typeof v === "number") ? v : parseFloat(v);
    if (isNaN(n)) return v + " " + selCur();
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) + " " + selCur();
  }
  function priceNum(p) { return (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price; }
  function imgOf(p) { return (p.image && p.image.url) || p.thumbnail || (p.images && p.images[0] && p.images[0].url) || ""; }

  salla.product
    .fetch({ source: "categories", source_value: [Number(cat)], per_page: 12 })
    .then(function (res) {
      var products = (res && (res.data || res.products || res)) || [];
      if (!Array.isArray(products)) products = products.data || [];
      products = products.filter(function (p) {
        return String(p.id) !== String(window.MP_PRODUCT_ID)
          && !(p.is_out_of_stock === true || p.is_available === false || p.status === "out" || p.status === "sold");
      });
      if (!products.length) { wrap.hidden = true; return; }
      products.forEach(function (p) {
        var price = priceNum(p);
        var li = document.createElement("li");
        li.className = "mp-pair__row";
        li.setAttribute("data-pair", "");
        li.setAttribute("data-price", price);
        li.setAttribute("data-product-id", p.id);
        li.innerHTML =
          '<label class="mp-pair__item">' +
            '<input type="checkbox" class="mp-pair__cb" />' +
            '<span class="mp-pair__box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></span>' +
            '<img class="mp-pair__thumb" src="' + imgOf(p) + '" alt="" decoding="async" />' +
            '<span class="mp-pair__body"><span class="mp-pair__name">' + (p.name || "") + '</span>' +
            '<span class="mp-pair__meta">' + selL("عيّنة ٣ مل", "3 ml sample") + '</span></span>' +
            '<span class="mp-pair__price">' + money(price) + '</span>' +
          '</label>' +
          '<div class="mp-pair__opts"><div class="mp-pair__opts-in"><div class="mp-pair__qty" data-pair-qty aria-label="' + selL("الكمية", "Quantity") + '">' +
            '<button type="button" class="mp-pair__qbtn" data-pair-minus aria-label="' + selL("إنقاص", "Decrease") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg></button>' +
            '<span class="mp-pair__qval" data-pair-qval role="status">1</span>' +
            '<button type="button" class="mp-pair__qbtn" data-pair-plus aria-label="' + selL("زيادة", "Increase") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg></button>' +
          '</div></div></div>';
        list.appendChild(li);
      });
      wireRows();
      wrap.hidden = false;
    })
    .catch(function () { wrap.hidden = true; });

  function wireRows() {
    Array.prototype.slice.call(list.querySelectorAll(".mp-pair__row")).forEach(function (row) {
      var cb = row.querySelector(".mp-pair__cb");
      var qval = row.querySelector("[data-pair-qval]");
      var minus = row.querySelector("[data-pair-minus]");
      var plus = row.querySelector("[data-pair-plus]");
      var qty = 1;
      function paint() {
        row.classList.toggle("is-on", !!(cb && cb.checked));
        if (qval) qval.textContent = qty;
        if (minus) minus.disabled = qty <= 1;
      }
      if (cb) cb.addEventListener("change", function () { if (!cb.checked) qty = 1; paint(); });
      if (minus) minus.addEventListener("click", function () { qty = Math.max(1, qty - 1); paint(); });
      if (plus) plus.addEventListener("click", function () { qty = Math.min(9, qty + 1); paint(); });
      row._selection = function () { return cb && cb.checked ? { id: Number(row.getAttribute("data-product-id")), qty: qty } : null; };
      paint();
    });

    var add = document.getElementById("mp-add");
    if (add) add.addEventListener("click", function () {
      var sels = Array.prototype.slice.call(list.querySelectorAll(".mp-pair__row"))
        .map(function (row) { return row._selection && row._selection(); })
        .filter(Boolean);
      if (!sels.length || !window.salla || !salla.cart) return;
      // add one at a time (parallel salla.cart.addItem calls race and can
      // drop items — the "only 1 product" widget). Let the product's own add
      // (product.js) go first, then chain the samples.
      var chain = new Promise(function (r) { setTimeout(r, 250); });
      sels.forEach(function (sel) {
        chain = chain.then(function () {
          try { return salla.cart.addItem({ id: sel.id, quantity: sel.qty }); } catch (e) {}
        }).catch(function () {});
      });
    });
  }
})();
