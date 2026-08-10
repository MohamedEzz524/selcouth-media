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

  function money(v) { try { if (salla.money) return salla.money(v); } catch (e) {} return v + " ر.س"; }
  function priceNum(p) { return (p.sale_price != null && p.sale_price !== 0) ? p.sale_price : p.price; }
  function imgOf(p) { return (p.image && p.image.url) || p.thumbnail || (p.images && p.images[0] && p.images[0].url) || ""; }

  salla.product
    .fetch({ source: "categories", source_value: [Number(cat)], per_page: 12 })
    .then(function (res) {
      var products = (res && (res.data || res.products || res)) || [];
      if (!Array.isArray(products)) products = products.data || [];
      products = products.filter(function (p) { return String(p.id) !== String(window.MP_PRODUCT_ID); });
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
            '<span class="mp-pair__meta">عيّنة ٣ مل</span></span>' +
            '<span class="mp-pair__price">' + money(price) + '</span>' +
          '</label>' +
          '<div class="mp-pair__opts"><div class="mp-pair__opts-in"><div class="mp-pair__qty" data-pair-qty aria-label="الكمية">' +
            '<button type="button" class="mp-pair__qbtn" data-pair-minus aria-label="إنقاص"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg></button>' +
            '<span class="mp-pair__qval" data-pair-qval role="status">1</span>' +
            '<button type="button" class="mp-pair__qbtn" data-pair-plus aria-label="زيادة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg></button>' +
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
