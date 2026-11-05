(function () {
  if (!window.CMS) {
    console.error("Baukarussell Vorschau: Decap CMS wurde vor der Vorschau geladen.");
    return;
  }

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

  function assetUrl(props, value) {
    if (!value) return null;
    var asset = props.getAsset(value);
    return asset ? asset.toString() : null;
  }

  var EventsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(["data", "title"]) || "Event";
      var subtitle = entry.getIn(["data", "subtitle"]) || "";
      var date = entry.getIn(["data", "date"]) || "";
      var location = entry.getIn(["data", "location"]) || "";
      var image = assetUrl(this.props, entry.getIn(["data", "image"]));
      var partners = entry.getIn(["data", "partners"]);
      var gallery = entry.getIn(["data", "gallery"]);

      return h("article", { className: "bk-preview" },
        h("header", { className: "bk-preview-hero" },
          image ? h("img", { className: "bk-preview-cover", src: image, alt: title }) : null,
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
              var galleryImage = assetUrl(this.props, item.get("image"));
              return galleryImage ? h("img", {
                key: index,
                src: galleryImage,
                alt: "Impression " + (index + 1)
              }) : null;
            }, this).toArray()
          )
        ) : null
      );
    }
  });

  var ProjectsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(["data", "title"]) || "Projekt";
      var date = entry.getIn(["data", "date"]) || "";
      var member = entry.getIn(["data", "member"]) || "";
      var image = assetUrl(this.props, entry.getIn(["data", "image"]));
      var categories = entry.getIn(["data", "categories"]);
      return h("article", { className: "bk-preview" },
        h("header", { className: "bk-preview-hero" },
          image ? h("img", { className: "bk-preview-cover", src: image, alt: title }) : null,
          h("div", { className: "bk-preview-shade" }),
          h("div", { className: "bk-preview-heading" },
            h("div", { className: "bk-preview-date" }, dateLabel(date)),
            h("h1", null, title),
            member ? h("p", { className: "bk-preview-subtitle" }, member) : null
          )
        ),
        categories && categories.size ? h("div", { className: "bk-preview-tags" },
          categories.map(function (item, index) {
            var category = typeof item === "string" ? item : (item.get ? item.get("category") : "");
            return category ? h("span", { className: "bk-preview-tag", key: index }, category) : null;
          }).toArray()
        ) : null,
        h("section", { className: "bk-preview-content" },
          h("div", { className: "bk-preview-body" }, this.props.widgetFor("body"))
        )
      );
    }
  });

  var MembersPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(["data", "title"]) || "Mitglied";
      var tagline = entry.getIn(["data", "tagline"]) || "";
      var logo = assetUrl(this.props, entry.getIn(["data", "logo"]));
      var portrait = assetUrl(this.props, entry.getIn(["data", "profile_image"]));
      var services = entry.getIn(["data", "services"]);
      var address = entry.getIn(["data", "address"]) || "";
      var phone = entry.getIn(["data", "phone"]) || "";
      var mobile = entry.getIn(["data", "mobile"]) || "";
      var email = entry.getIn(["data", "email"]) || "";
      var website = entry.getIn(["data", "website"]) || "";
      var quote = entry.getIn(["data", "quote"]) || "";
      return h("article", { className: "bk-preview" },
        h("section", { className: "bk-preview-member" },
          portrait ? h("img", { className: "bk-preview-portrait", src: portrait, alt: title }) :
            (logo ? h("img", { className: "bk-preview-member-logo", src: logo, alt: title }) : null),
          h("div", null,
            h("h1", null, title),
            tagline ? h("p", { className: "bk-preview-subtitle" }, tagline) : null,
            h("div", { className: "bk-preview-body" }, this.props.widgetFor("body")),
            services && services.size ? h("section", { className: "bk-preview-section" },
              h("h2", null, "Leistungen"),
              h("div", { className: "bk-preview-tags" },
                services.map(function (item, index) {
                  var service = typeof item === "string" ? item : (item.get ? item.get("service") : "");
                  return service ? h("span", { className: "bk-preview-tag", key: index }, service) : null;
                }).toArray()
              )
            ) : null
          )
        ),
        h("section", { className: "bk-preview-section" },
          h("h2", null, "Kontakt"),
          address ? h("p", null, address) : null,
          phone ? h("p", null, "Telefon: " + phone) : null,
          mobile ? h("p", null, "Mobile: " + mobile) : null,
          email ? h("p", null, email) : null,
          website ? h("p", null, website) : null
        ),
        quote ? h("blockquote", { className: "bk-preview-quote" }, "„" + quote + "“") : null
      );
    }
  });

  window.CMS.registerPreviewStyle("/admin/preview.css");
  window.CMS.registerPreviewTemplate("events", EventsPreview);
  window.CMS.registerPreviewTemplate("projekte", ProjectsPreview);
  window.CMS.registerPreviewTemplate("mitglieder", MembersPreview);
})();
