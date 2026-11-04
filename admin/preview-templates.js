(function () {
  if (!window.CMS) {
    console.error("Baukarussell Vorschau: Decap CMS wurde vor der Vorschau geladen.");
    return;
  }

  var EventsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(["data", "title"]) || "Event";
      var subtitle = entry.getIn(["data", "subtitle"]) || "";
      var date = entry.getIn(["data", "date"]) || "";
      var location = entry.getIn(["data", "location"]) || "";
      var imageValue = entry.getIn(["data", "image"]);
      var image = imageValue ? this.props.getAsset(imageValue) : null;
      var partners = entry.getIn(["data", "partners"]);
      var gallery = entry.getIn(["data", "gallery"]);

      function dateLabel(value) {
        if (!value) return "";
        var parsed = new Date(value);
        return isNaN(parsed.getTime())
          ? value
          : parsed.toLocaleDateString("de-CH", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            });
      }

      return h("article", { className: "bk-preview" },
        h("header", { className: "bk-preview-hero" },
          image ? h("img", {
            className: "bk-preview-cover",
            src: image.toString(),
            alt: title
          }) : null,
          h("div", { className: "bk-preview-shade" }),
          h("div", { className: "bk-preview-heading" },
            h("div", { className: "bk-preview-date" }, dateLabel(date)),
            h("h1", null, title),
            subtitle ? h("p", { className: "bk-preview-subtitle" }, subtitle) : null
          )
        ),
        h("section", { className: "bk-preview-content" },
          location ? h("div", { className: "bk-preview-location" }, location) : null,
          h("div", { className: "bk-preview-body" }, this.props.widgetFor("body"))
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
              var imageValue = item.get("image");
              var galleryImage = imageValue ? this.props.getAsset(imageValue) : null;
              return galleryImage ? h("img", {
                key: index,
                src: galleryImage.toString(),
                alt: "Impression " + (index + 1)
              }) : null;
            }, this).toArray()
          )
        ) : null
      );
    }
  });

  window.CMS.registerPreviewStyle("/admin/preview.css");
  window.CMS.registerPreviewTemplate("events", EventsPreview);
})();