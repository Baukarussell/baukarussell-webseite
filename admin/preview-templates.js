(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var h = window.h;
  var EventsPreview = window.createClass({
    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(["data", "title"]) || "Event";
      var subtitle = entry.getIn(["data", "subtitle"]) || "";
      var date = entry.getIn(["data", "date"]) || "";
      var location = entry.getIn(["data", "location"]) || "";
      var image = entry.getIn(["data", "image"]) || "";
      var body = entry.getIn(["data", "body"]) || "";
      var partners = entry.getIn(["data", "partners"]);
      var gallery = entry.getIn(["data", "gallery"]);
      function asset(path) {
        if (!path) return "";
        if (/^(https?:)?\\/\\//i.test(path)) return path;
        return path.charAt(0) === "/" ? path : "/" + path;
      }
      function dateLabel(value) {
        if (!value) return "";
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });
      }
      return h("article", { className: "bk-preview" },
        h("header", { className: "bk-preview-hero" },
          image ? h("img", { className: "bk-preview-cover", src: asset(image), alt: title }) : null,
          h("div", { className: "bk-preview-shade" }),
          h("div", { className: "bk-preview-heading" },
            h("div", { className: "bk-preview-date" }, dateLabel(date)),
            h("h1", null, title),
            subtitle ? h("p", { className: "bk-preview-subtitle" }, subtitle) : null
          )
        ),
        h("section", { className: "bk-preview-content" },
          location ? h("div", { className: "bk-preview-location" }, location) : null,
          h("div", { className: "bk-preview-body" }, body)
        ),
        partners && partners.size ? h("section", { className: "bk-preview-section" },
          h("h2", null, "Ein herzliches Dankeschön an unsere Eventpartner"),
          h("div", { className: "bk-preview-partners" },
            partners.map(function (partner, index) {
              return h("div", { className: "bk-preview-partner", key: index },
                h("span", null, partner.get("role") || "Eventpartner"),
                h("strong", null, partner.get("name") || ""),
                partner.get("contact") ? h("small", null, partner.get("contact")) : null
              );
            }).toArray()
          )
        ) : null,
        gallery && gallery.size ? h("section", { className: "bk-preview-section" },
          h("h2", null, "Impressionen"),
          h("div", { className: "bk-preview-gallery" },
            gallery.map(function (item, index) {
              var src = asset(item.get("image"));
              return src ? h("img", { key: index, src: src, alt: "Impression " + (index + 1) }) : null;
            }).toArray()
          )
        ) : null
      );
    }
  });
  CMS.registerPreviewStyle("/admin/preview.css");
  CMS.registerPreviewTemplate("events", EventsPreview);
})();