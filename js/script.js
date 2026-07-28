/* =========================================================
   Social Cafe — interface behaviour
   Header state, mobile nav, scroll-spy, reveals and the
   review carousel. No libraries.
   ========================================================= */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ---------- header + mobile nav ---------- */

    var header = document.getElementById('site-header');
    var menuBtn = document.getElementById('menu-btn');
    var nav = document.getElementById('nav');

    if (header) {
        var setStuck = function () {
            header.classList.toggle('is-stuck', window.scrollY > 24);
        };
        setStuck();
        window.addEventListener('scroll', setStuck, { passive: true });
    }

    function closeNav() {
        if (!nav || !menuBtn) return;
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
        menuBtn.querySelector('use').setAttribute('href', '#i-menu');
    }

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', String(open));
            menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
        });

        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) closeNav();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeNav();
        });
    }

    /* ---------- hero spotlight ---------- */

    // Only worth wiring up where there is a cursor to follow; touch devices
    // fall back to the slightly brighter dim layer set in CSS.
    var hero = document.querySelector('.hero');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    if (hero && finePointer.matches) {
        var spotX = 0;
        var spotY = 0;
        var spotTick = false;

        var placeSpot = function () {
            spotTick = false;
            hero.style.setProperty('--spot-x', spotX + 'px');
            hero.style.setProperty('--spot-y', spotY + 'px');
        };

        hero.addEventListener('pointermove', function (e) {
            var box = hero.getBoundingClientRect();
            spotX = e.clientX - box.left;
            spotY = e.clientY - box.top;
            if (!spotTick) {
                spotTick = true;
                requestAnimationFrame(placeSpot);
            }
        }, { passive: true });

        hero.addEventListener('pointerenter', function () {
            hero.classList.add('is-spotlit');
        });

        hero.addEventListener('pointerleave', function () {
            hero.classList.remove('is-spotlit');
        });
    }

    /* ---------- scroll-spy ---------- */

    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    var targets = links
        .map(function (a) { return document.querySelector(a.getAttribute('href')); })
        .filter(Boolean);

    if (targets.length && 'IntersectionObserver' in window) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (a) {
                    a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        targets.forEach(function (t) { spy.observe(t); });
    }

    /* ---------- reveals ---------- */

    var revealables = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

    if (!revealables.length) {
        // nothing to do
    } else if (reduced.matches || !('IntersectionObserver' in window)) {
        revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        // stagger siblings so groups arrive as a wave rather than all at once
        var seen = new Map();
        revealables.forEach(function (el) {
            var parent = el.parentElement;
            var i = seen.get(parent) || 0;
            seen.set(parent, i + 1);
            el.style.setProperty('--reveal-delay', (i * 70) + 'ms');
        });

        var revealer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                revealer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });

        revealables.forEach(function (el) { revealer.observe(el); });
    }

    /* ---------- review carousel ---------- */

    var viewport = document.getElementById('reviews-track');
    var dotsBox = document.getElementById('reviews-dots');

    if (viewport && dotsBox) {
        var slides = Array.prototype.slice.call(viewport.children);
        var dots = slides.map(function (slide, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'reviews__dot';
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-label', 'Review ' + (i + 1) + ' of ' + slides.length);
            b.addEventListener('click', function () {
                paused = true;
                goTo(i);
            });
            dotsBox.appendChild(b);
            return b;
        });

        var current = 0;
        var paused = false;

        function goTo(i) {
            var slide = slides[i];
            if (!slide) return;
            viewport.scrollTo({
                left: slide.offsetLeft - (viewport.clientWidth - slide.clientWidth) / 2,
                behavior: reduced.matches ? 'auto' : 'smooth'
            });
        }

        function sync() {
            var centre = viewport.scrollLeft + viewport.clientWidth / 2;
            var best = 0;
            var bestDist = Infinity;
            slides.forEach(function (slide, i) {
                var d = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - centre);
                if (d < bestDist) { bestDist = d; best = i; }
            });
            if (best === current) return;
            current = best;
            dots.forEach(function (d, i) {
                d.classList.toggle('is-active', i === current);
                d.setAttribute('aria-selected', String(i === current));
            });
        }

        dots[0].classList.add('is-active');
        dots[0].setAttribute('aria-selected', 'true');

        var syncTick = false;
        viewport.addEventListener('scroll', function () {
            if (syncTick) return;
            syncTick = true;
            requestAnimationFrame(function () { syncTick = false; sync(); });
        }, { passive: true });

        ['pointerenter', 'focusin', 'pointerdown'].forEach(function (evt) {
            viewport.addEventListener(evt, function () { paused = true; });
        });
        viewport.addEventListener('pointerleave', function () { paused = false; });

        if (!reduced.matches) {
            setInterval(function () {
                if (paused || document.hidden) return;
                goTo((current + 1) % slides.length);
            }, 6500);
        }
    }

    /* ---------- misc ---------- */

    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
