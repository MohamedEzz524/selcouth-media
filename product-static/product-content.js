/* ============================================================
   SELCOUTH PDP — parse the product Description (one Salla field) into the
   reference design. The Description is sectioned by <h1..h4> headings:

     <h3>المكوّن الأبرز</h3><p>…</p>      -> hero-ingredient line
     <h3>عائلة العطر</h3><p>…</p>         -> tab 0 (الوصف)
     <h3>النوتات</h3><p>…</p>             -> tab 1 (النوتات)
     <h3>المكوّنات</h3><p>…</p>           -> tab 2 (المكوّنات)
     <h3>التقييم</h3><p>الفوحان: 3</p>
                     <p>الثبات: 5</p>      -> the two stat bars

   Runs before product.js so the tabs/stats are ready when it initialises.
   ============================================================ */
(function () {
  var src = document.getElementById("mp-desc-source");
  if (!src) return;

  // ---- split Description into sections keyed by heading text ----
  var sections = [];
  var cur = null;
  Array.prototype.slice.call(src.children).forEach(function (node) {
    if (/^H[1-6]$/.test(node.tagName)) {
      cur = { title: (node.textContent || "").trim(), html: [node.outerHTML], text: "" };
      sections.push(cur);
    } else if (cur) {
      cur.html.push(node.outerHTML);
      cur.text += " " + (node.textContent || "");
    } else {
      cur = { title: "", html: [node.outerHTML], text: node.textContent || "" };
      sections.push(cur);
    }
  });

  function find(keywords) {
    for (var i = 0; i < sections.length; i++) {
      for (var k = 0; k < keywords.length; k++) {
        if (sections[i].title.indexOf(keywords[k]) !== -1) return sections[i];
      }
    }
    return null;
  }

  // ---- tabs ----
  function setTab(idx, section) {
    var panel = document.querySelector('.mp-tab[data-panel="' + idx + '"]');
    var btn = document.querySelector('.mp-tab-link[data-tab="' + idx + '"]');
    if (!panel || !section) { if (btn) btn.hidden = true; return; }
    panel.innerHTML = section.html.join("");
    if (btn) btn.hidden = false;
  }
  setTab(0, find(["عائلة العطر", "العطر", "الوصف", "Fragrance", "Family", "Description"]) || sections[0]);
  setTab(1, find(["النوتات", "نوتات", "Notes"]));
  setTab(2, find(["المكوّنات", "المكونات", "مكونات", "Ingredients"]));

  // ---- hero-ingredient (المكوّن الأبرز / Hero Ingredient) ----
  var hero = find(["الأبرز", "Hero"]);
  if (hero) {
    var txt = (hero.title + ": " + hero.text).replace(/\s+/g, " ").trim();
    var el = document.getElementById("mp-feature"), t = document.getElementById("mp-feature-txt");
    if (t && el) { t.textContent = txt; el.hidden = false; }
  }

  // ---- stat bars (التقييم -> الفوحان / الثبات) ----
  var stat = find(["التقييم", "الفوحان", "الثبات", "Rating", "Projection", "Longevity"]);
  if (stat) {
    var body = stat.text + " " + (stat.title || "");
    var arab = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9 };
    function num(s) { return parseInt(String(s).replace(/[٠-٩]/g, function (c) { return arab[c]; }), 10); }
    function apply(dataStat, keys) {
      var m = null;
      for (var j = 0; j < keys.length && !m; j++) {
        m = body.match(new RegExp(keys[j] + "\\s*[:：]?\\s*([0-9٠-٩]+)"));
      }
      var el = document.querySelector('.mp-stat[data-stat="' + dataStat + '"]');
      if (!el || !m) return;
      var n = num(m[1]);
      var spans = el.querySelectorAll(".mp-stat__bar span");
      for (var i = 0; i < spans.length; i++) spans[i].classList.toggle("is-active", i === n - 1);
      el.hidden = false;
    }
    apply("الفوحان", ["الفوحان", "Projection"]);
    apply("الثبات", ["الثبات", "Longevity"]);
  }
})();
