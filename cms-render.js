(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function url(value, fallback) {
    var v = String(value || "").trim();
    if (!v) return fallback || "/cover.jpg";
    if (/^(https?:\/\/|\/)/i.test(v)) return esc(v);
    if (/^javascript:/i.test(v)) return fallback || "/cover.jpg";
    return "/" + esc(v.replace(/^\.?\//, ""));
  }
  function safeHref(value) {
    var v = String(value || "").trim();
    if (/^(https?:\/\/|mailto:|tel:|\/|events\/|projekte\/|mitglieder\/)/i.test(v)) return esc(v);
    return "#";
  }
  function dateText(value) {
    var d = new Date(value);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
  }
  function yearText(value) {
    var d = new Date(value);
    return isNaN(d.getTime()) ? "" : String(d.getFullYear());
  }
  function slug(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " und ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function list(values, key) {
    if (!Array.isArray(values)) return [];
    return values.map(function (item) {
      if (typeof item === "string") return item;
      return item && item[key] ? item[key] : "";
    }).filter(Boolean);
  }
  function summary(record, max) {
    var value = String(record.bodyText || "").trim();
    if (value.length <= max) return value;
    return value.slice(0, max).replace(/\s+\S*$/, "") + "…";
  }
  function findMember(name, members) {
    var n = String(name || "").toLowerCase();
    return members.find(function (m) { return String(m.title || "").toLowerCase() === n; }) || null;
  }

  function eventCard(e) {
    var title = esc(e.title || "Event");
    return '<a href="events/' + esc(e.slug) + '.html" class="event-card" data-year="' + yearText(e.date) + '">' +
      '<div class="event-card-image"><img src="' + url(e.image) + '" alt="' + title + '" loading="lazy"><div class="event-card-date-badge">' + yearText(e.date) + '</div></div>' +
      '<div class="event-card-info"><div class="event-card-date">' + dateText(e.date) + '</div><h3 class="event-card-title">' + title + '</h3><span class="event-card-read">Mehr erfahren →</span></div></a>';
  }
  function featuredEvent(e) {
    if (!e) return '<div class="empty-state"><h3>Weitere Events folgen</h3><p>Wir arbeiten gerade an neuen Events. Schau bald wieder vorbei.</p></div>';
    var title = esc(e.title || "Event");
    return '<a href="events/' + esc(e.slug) + '.html" class="featured-event"><div class="featured-image"><img src="' + url(e.image) + '" alt="' + title + '"></div>' +
      '<div class="featured-info"><div class="featured-meta">' + dateText(e.date) + ' <span>•</span> Networking Event</div><h2 class="featured-title">' + title + '</h2>' +
      '<p class="featured-description">' + esc(summary(e, 230)) + '</p>' +
      (e.location ? '<div class="featured-location">Location <strong>' + esc(e.location) + '</strong></div>' : '') +
      '<span class="btn-featured">Mehr erfahren →</span></div></a>';
  }
  function projectCard(p, members) {
    var cats = list(p.categories, "category");
    var member = findMember(p.member, members);
    var tags = cats.map(function (c) { return '<span class="project-tag ' + slug(c) + '">' + esc(c) + '</span>'; }).join("");
    return '<a href="projekte/' + esc(p.slug) + '.html" class="project-card" data-tags="' + cats.map(slug).join(" ") + '">' +
      '<div class="project-image"><img src="' + url(p.image) + '" alt="' + esc(p.title) + '" loading="lazy"><div class="project-tags">' + tags + '</div></div>' +
      '<div class="project-date">' + dateText(p.date) + '</div><h3 class="project-title">' + esc(p.title) + '</h3>' +
      '<div class="project-bottom">' + (member && member.logo ? '<img src="' + url(member.logo) + '" alt="' + esc(member.title) + '" class="project-member-logo">' : '') +
      '<span class="project-read-more">Weiterlesen →</span></div></a>';
  }
  function memberCard(m) {
    var internal = m.slug === "onur";
    var href = internal ? "mitglieder/onur.html" : (m.website || ("mitglieder/" + m.slug + ".html"));
    return '<div class="member-card reveal ' + (internal ? "featured" : "") + '"><img src="' + url(m.logo) + '" alt="' + esc(m.title) + '" class="member-img">' +
      '<a href="' + safeHref(href) + '"' + (internal ? "" : ' target="_blank" rel="noopener"') + ' class="member-btn">' + (internal ? "Mehr erfahren →" : "Website →") + '</a></div>';
  }
  function homeProject(p, members) {
    var m = findMember(p.member, members);
    return '<a href="projekte/' + esc(p.slug) + '.html" class="project-card reveal"><div class="project-image"><img src="' + url(p.image) + '" alt="' + esc(p.title) + '"></div>' +
      '<div class="project-info"><div class="project-meta">' + dateText(p.date) + ' <span>•</span> Projekt</div><h3 class="project-title">' + esc(p.title) + '</h3>' +
      '<p class="project-description">' + esc(summary(p, 180)) + '</p><div class="project-member">Von <strong>' + esc(m ? m.title : (p.member || "Baukarussell Netzwerk")) + '</strong></div></div></a>';
  }
  function homeEvent(e) {
    if (!e) return "";
    return '<a href="events/' + esc(e.slug) + '.html" class="featured-event reveal"><div class="featured-event-image"><img src="' + url(e.image) + '" alt="' + esc(e.title) + '"></div>' +
      '<div class="featured-event-info"><div class="featured-event-meta">' + dateText(e.date) + ' <span>•</span> Networking Event</div><h3 class="featured-event-title">' + esc(e.title) + '</h3>' +
      '<p class="featured-event-description">' + esc(summary(e, 230)) + '</p><div class="featured-event-location">Location <strong>' + esc(e.location || "Baukarussell Netzwerk") + '</strong></div>' +
      '<span class="btn-event">Alle Fotos ansehen →</span></div></a>';
  }

  function renderEventDetail(e) {
    var partners = Array.isArray(e.partners) && e.partners.length
      ? '<section class="panel"><h2>Ein herzliches Dankeschön an unsere Eventpartner</h2>' + e.partners.map(function (p) {
          return '<div class="row"><span>' + esc(p.role) + '</span><strong>' + esc(p.name) + '</strong><small>' + esc(p.contact) + '</small></div>';
        }).join("") + '</section>' : "";
    var galleryItems = Array.isArray(e.gallery) ? e.gallery.map(function (item) {
      if (typeof item === "string") return item;
      return item && item.image ? item.image : "";
    }).filter(Boolean) : [];
    var gallery = galleryItems.length
      ? '<section class="gallery"><h2>Impressionen</h2><div class="gallery-grid">' + galleryItems.map(function (image, i) {
          return '<a href="' + url(image) + '" target="_blank" rel="noopener"><img src="' + url(image) + '" alt="Impression ' + (i + 1) + '" loading="lazy"></a>';
        }).join("") + '</div></section>' : "";
    return '<section class="hero"><img src="' + url(e.image) + '" alt="' + esc(e.title) + '"><div class="hero-copy"><div class="meta">' + dateText(e.date) + '</div><h1>' + esc(e.title) + '</h1></div></section>' +
      '<section class="content">' + (e.subtitle ? '<h2>' + esc(e.subtitle) + '</h2>' : '') + (e.location ? '<p class="location">' + esc(e.location) + '</p>' : '') +
      (e.bodyHtml || "") + '</section>' + partners + gallery;
  }
  function renderProjectDetail(p, members) {
    var m = findMember(p.member, members);
    var contact = m ? '<div class="memberbox"><div><h3>Projekt von</h3><h2>' + esc(m.title) + '</h2>' +
      (m.address ? '<p>' + esc(m.address) + '</p>' : '') + (m.phone ? '<p>T ' + esc(m.phone) + '</p>' : '') +
      (m.email ? '<p><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></p>' : '') +
      (m.website ? '<p><a href="' + safeHref(m.website) + '" target="_blank" rel="noopener">Website besuchen →</a></p>' : '') +
      '</div>' + (m.logo ? '<img src="' + url(m.logo) + '" alt="' + esc(m.title) + '">' : '') + '</div>' : "";
    return '<section class="hero"><img src="' + url(p.image) + '" alt="' + esc(p.title) + '"><div class="hero-copy"><div class="meta">' + dateText(p.date) + '</div><h1>' + esc(p.title) + '</h1></div></section>' +
      '<section class="content">' + (p.bodyHtml || "") + contact + '</section>';
  }
  function renderMemberDetail(m) {
    var services = list(m.services, "service");
    var photo = m.profile_image ? '<img class="profile-photo" src="' + url(m.profile_image) + '" alt="' + esc(m.title) + '">' :
      '<img class="profile-logo" src="' + url(m.logo) + '" alt="' + esc(m.title) + '">';
    var links = (m.website ? '<a href="' + esc(m.website) + '" target="_blank" rel="noopener">Website besuchen →</a>' : '') +
      (m.email ? '<a href="mailto:' + esc(m.email) + '">E-Mail senden →</a>' : '') +
      (m.linkedin ? '<a href="' + safeHref(m.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>' : '') +
      (m.youtube ? '<a href="' + safeHref(m.youtube) + '" target="_blank" rel="noopener">YouTube</a>' : '');
    var contact = (m.address ? '<div>' + esc(m.address) + '</div>' : '') +
      (m.phone ? '<div>T <a href="tel:' + esc(m.phone) + '">' + esc(m.phone) + '</a></div>' : '') +
      (m.mobile ? '<div>M <a href="tel:' + esc(m.mobile) + '">' + esc(m.mobile) + '</a></div>' : '') +
      (m.email ? '<div><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></div>' : '');
    return '<section class="profile">' + photo + '<div><h1>' + esc(m.title) + '</h1>' +
      (m.tagline ? '<p class="tagline">' + esc(m.tagline) + '</p>' : '') + (m.bodyHtml || '') +
      (services.length ? '<div class="panel"><strong>Leistungen</strong><p>' + services.map(esc).join(" · ") + '</p></div>' : '') +
      '<div class="links">' + links + '</div></div></section>' +
      '<section class="contact"><div><h2>Kontakt</h2>' + contact + (m.website ? '<p><a href="' + esc(m.website) + '" target="_blank" rel="noopener">' + esc(m.website.replace(/^https?:\/\//, "")) + '</a></p>' : '') +
      '</div><img class="contact-logo" src="' + url(m.logo) + '" alt="' + esc(m.title) + '"></section>' +
      (m.quote ? '<section class="quote">„' + esc(m.quote) + '“</section>' : '');
  }

  async function run() {
    var detail = document.getElementById("cms-detail");
    var type = detail ? detail.getAttribute("data-cms-type") : "";
    var dataUrl = type ? "../cms-data.json" : "cms-data.json";
    var response = await fetch(dataUrl);
    if (!response.ok) throw new Error("CMS Daten konnten nicht geladen werden.");
    var data = await response.json();
    var events = data.events || [], projects = data.projects || [], members = data.members || [];

    if (detail) {
      var slugName = decodeURIComponent(location.pathname.split("/").pop().replace(/\.html$/, ""));
      var collection = type === "event" ? events : (type === "project" ? projects : members);
      var record = collection.find(function (item) { return item.slug === slugName; });
      if (!record) { detail.innerHTML = "<section class=\"content\"><h1>Inhalt nicht gefunden</h1></section>"; return; }
      detail.innerHTML = type === "event" ? renderEventDetail(record) : (type === "project" ? renderProjectDetail(record, members) : renderMemberDetail(record));
      document.title = (record.title || "Baukarussell") + " – Baukarussell";
      return;
    }

    if (location.pathname.endsWith("/events.html")) {
      var feature = document.querySelector(".featured-section");
      if (feature) feature.innerHTML = featuredEvent(events[0]);
      var grid = document.getElementById("eventsGrid");
      if (grid) grid.innerHTML = events.slice(1).map(eventCard).join("");
      var years = Array.from(new Set(events.map(function (e) { return yearText(e.date); }).filter(Boolean))).sort().reverse();
      var buttons = ['<button class="filter-btn active" onclick="filterEvents(\'alle\', this)">Alle</button>'].concat(
        years.map(function (y) { return '<button class="filter-btn" onclick="filterEvents(\'' + y + '\', this)">' + y + '</button>'; })
      );
      var filter = document.querySelector(".filter-buttons");
      if (filter) filter.innerHTML = buttons.join("");
    }

    if (location.pathname.endsWith("/projekte.html")) {
      var projectGrid = document.getElementById("projectsGrid");
      if (projectGrid) projectGrid.innerHTML = projects.map(function (p) { return projectCard(p, members); }).join("");
      var categories = Array.from(new Set(projects.reduce(function (all, p) { return all.concat(list(p.categories, "category")); }, []))).sort();
      var projectButtons = ['<button class="filter-btn active" onclick="filterProjects(\'alle\', this)">Alle</button>'].concat(
        categories.map(function (c) { return '<button class="filter-btn" onclick="filterProjects(\'' + slug(c) + '\', this)">' + esc(c) + '</button>'; })
      );
      var projectFilter = document.querySelector(".filter-buttons");
      if (projectFilter) projectFilter.innerHTML = projectButtons.join("");
    }

    if (location.pathname.endsWith("/index.html") || location.pathname === "/") {
      var membersGrid = document.querySelector("#members .members-grid");
      if (membersGrid) membersGrid.innerHTML = members.map(memberCard).join("");
      var homeProjects = document.querySelector(".projects-section .projects-grid");
      if (homeProjects) homeProjects.innerHTML = projects.slice(0, 3).map(function (p) { return homeProject(p, members); }).join("");
      var eventLink = document.querySelector(".events-section a.featured-event");
      if (eventLink && events[0]) eventLink.outerHTML = homeEvent(events[0]);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { run().catch(console.error); });
  else run().catch(console.error);
})();
