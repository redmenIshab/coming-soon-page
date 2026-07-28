/* =========================================================
   THE THREAD
   One continuous curve that runs the length of the page and
   draws itself as you scroll. Each section owns a node on the
   curve; a node lights up the moment the line reaches it.

   The curve is built from the live positions of every
   [data-thread-node] section, so it re-routes on resize and
   after fonts/images settle.
   ========================================================= */

(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';

    var wrap = document.querySelector('.thread');
    var svg = document.getElementById('thread-svg');
    var track = document.getElementById('thread-track');
    var line = document.getElementById('thread-line');
    var nodeLayer = document.getElementById('thread-nodes');
    var footer = document.getElementById('footer-end');
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-thread-node]'));

    if (!wrap || !svg || !line || !sections.length || !footer) return;

    // The thread lives in the left gutter, meandering between two fractions
    // of the viewport width. Swinging it across the full page would drag the
    // line diagonally through the content; staying in the gutter keeps it
    // visible end to end and never on top of anything.
    var LANE = {
        desktop: { low: 0.028, high: 0.085 },
        mobile: { low: 0.03, high: 0.075 }
    };

    var SAMPLES = 600;      // resolution of the y -> length lookup
    var EYE = 0.55;         // where "now" sits in the viewport (55% down)

    var nodes = [];
    var sampleLen = [];
    var sampleY = [];
    var totalLen = 0;
    var ticking = false;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ---------- geometry ---------- */

    // Catmull-Rom through the points, emitted as cubic beziers.
    function smoothPath(pts) {
        var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
        for (var i = 0; i < pts.length - 1; i++) {
            var p0 = pts[i - 1] || pts[i];
            var p1 = pts[i];
            var p2 = pts[i + 1];
            var p3 = pts[i + 2] || p2;

            var c1x = p1.x + (p2.x - p0.x) / 6;
            var c1y = p1.y + (p2.y - p0.y) / 6;
            var c2x = p2.x - (p3.x - p1.x) / 6;
            var c2y = p2.y - (p3.y - p1.y) / 6;

            d += ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) +
                ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
                ', ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
        }
        return d;
    }

    // Length along the path at a given document y. The path only ever
    // descends, so the sampled y values are monotonic and binary-searchable.
    function lenAtY(y) {
        if (y <= sampleY[0]) return 0;
        if (y >= sampleY[sampleY.length - 1]) return totalLen;

        var lo = 0;
        var hi = sampleY.length - 1;
        while (hi - lo > 1) {
            var mid = (lo + hi) >> 1;
            if (sampleY[mid] < y) lo = mid; else hi = mid;
        }
        var span = sampleY[hi] - sampleY[lo];
        var t = span > 0 ? (y - sampleY[lo]) / span : 0;
        return sampleLen[lo] + (sampleLen[hi] - sampleLen[lo]) * t;
    }

    function circle(x, y, r, cls) {
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x.toFixed(1));
        c.setAttribute('cy', y.toFixed(1));
        c.setAttribute('r', r);
        c.setAttribute('class', cls);
        return c;
    }

    /* ---------- build ---------- */

    function build() {
        var w = document.documentElement.clientWidth;
        var docHeight = footer.offsetTop + footer.offsetHeight;
        var lane = w <= 768 ? LANE.mobile : LANE.desktop;

        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + docHeight);
        svg.setAttribute('width', w);
        svg.setAttribute('height', docHeight);
        wrap.style.height = docHeight + 'px';

        var pts = [];
        var scrollY = window.scrollY;

        // start just below the header
        pts.push({ y: 80, marker: false });

        sections.forEach(function (sec, i) {
            var rect = sec.getBoundingClientRect();
            var top = rect.top + scrollY;

            // the section's own dot, level with its middle
            pts.push({ y: top + rect.height / 2, marker: true });

            // a turning point in the gap before the next section, so the
            // curve changes direction between blocks rather than inside one
            var next = sections[i + 1];
            if (next) {
                var nextTop = next.getBoundingClientRect().top + scrollY;
                pts.push({ y: (top + rect.height + nextTop) / 2, marker: false });
            }
        });

        // turning point between the last section and the terminus, so the
        // final run curves like the rest instead of cutting a long diagonal
        // Placed between the last dot and the terminus rather than off the
        // last section's bottom edge — that edge can sit below the terminus,
        // which would make the curve dip past the final dot and double back.
        var endY = footer.offsetTop - 48;
        var lastNodeY = pts[pts.length - 1].y;
        pts.push({ y: lastNodeY + (endY - lastNodeY) * 0.6, tail: true });

        // terminus: the final dot, just above the footer
        pts.push({ y: endY, marker: true, tail: true });

        // alternate sides down the lane: dots land on the inner edge,
        // turning points on the outer one
        pts.forEach(function (p, i) {
            p.x = (i % 2 === 0 ? lane.low : lane.high) * w;
        });

        // the tail settles onto the centre of the lane so the thread comes
        // to rest instead of hooking back on itself at the last turn
        var mid = (lane.low + lane.high) / 2 * w;
        pts.forEach(function (p) {
            if (p.tail) p.x = mid;
        });

        var d = smoothPath(pts);
        line.setAttribute('d', d);
        track.setAttribute('d', d);

        totalLen = line.getTotalLength();
        line.style.strokeDasharray = totalLen;

        // y -> length lookup table
        sampleLen.length = 0;
        sampleY.length = 0;
        for (var s = 0; s <= SAMPLES; s++) {
            var l = totalLen * s / SAMPLES;
            sampleLen.push(l);
            sampleY.push(line.getPointAtLength(l).y);
        }

        // nodes
        nodeLayer.textContent = '';
        nodes = [];
        pts.forEach(function (p) {
            if (!p.marker) return;
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('class', 'thread-node');
            g.appendChild(circle(p.x, p.y, 7, 'thread-node__ring'));
            g.appendChild(circle(p.x, p.y, 4.5, 'thread-node__core'));
            nodeLayer.appendChild(g);
            nodes.push({ el: g, len: lenAtY(p.y), lit: false });
        });

        update();
    }

    /* ---------- scroll ---------- */

    function update() {
        ticking = false;

        if (reduced.matches) {
            line.style.strokeDashoffset = 0;
            nodes.forEach(function (n) {
                if (!n.lit) { n.lit = true; n.el.classList.add('is-lit'); }
            });
            return;
        }

        var drawn = lenAtY(window.scrollY + window.innerHeight * EYE);
        line.style.strokeDashoffset = totalLen - drawn;

        for (var i = 0; i < nodes.length; i++) {
            var lit = drawn >= nodes[i].len - 2;
            if (lit !== nodes[i].lit) {
                nodes[i].lit = lit;
                nodes[i].el.classList.toggle('is-lit', lit);
            }
        }
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    /* ---------- wiring ---------- */

    var rebuildTimer;
    function scheduleBuild() {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(build, 150);
    }

    build();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleBuild);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(build);
    }
    window.addEventListener('load', build);

    // Content can change height as images decode or the carousel settles.
    // Observing the content elements (not <body>) keeps the thread's own
    // height out of the measurement, so this can't feed back on itself.
    if (window.ResizeObserver) {
        var ro = new ResizeObserver(scheduleBuild);
        var main = document.querySelector('main');
        if (main) ro.observe(main);
        ro.observe(footer);
    }

    if (reduced.addEventListener) {
        reduced.addEventListener('change', update);
    }
})();
