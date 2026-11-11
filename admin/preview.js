/* Baukarussell event preview for Decap.
   Only improves how content looks while editing; it never publishes. */
(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var h = window.h;
  var Preview = window.createClass({
    render: function () {
      var entry = this.props.entry;
      var get = function (name) { return entry.getIn(['data', name]) || ''; };
      var title = String(get('title'));
      var subtitle = String(get('subtitle'));
      var location = String(get('location'));
      var date = String(get('date'));
      var niceDate = date;
      if (date) {
        var parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          niceDate = new Intl.DateTimeFormat('de-CH', {
            day:'2-digit',month:'long',year:'numeric',timeZone:'Europe/Zurich'
          }).format(parsed);
        }
      }
      var cover = get('image');
      var asset = cover ? this.props.getAsset(cover) : null;
      var gallery = get('galerie');
      var images = gallery && typeof gallery.toJS === 'function' ? gallery.toJS() : [];
      var assetFor = this.props.getAsset;
      var galleryViews = (Array.isArray(images) ? images : []).map(function (item, index) {
        var path = typeof item === 'string' ? item : (item && item.image);
        if (!path) return null;
        var resolved = assetFor(path);
        return resolved ? h('img', {key:index,src:String(resolved),alt:'Eventfoto '+(index+1)}) : null;
      }).filter(Boolean);
      return h('div', {className:'bk-preview'},
        h('div',{className:'bk-preview-cover'},asset && h('img',{src:String(asset),alt:title})),
        h('div',{className:'bk-preview-title'},
          h('div',{className:'bk-preview-date'},niceDate || 'DATUM'),
          h('h1',{},subtitle||title||'Eventtitel'),
          subtitle && h('div',{className:'bk-preview-eventname'},title),
          location && h('div',{className:'bk-preview-location'},location)
        ),
        h('article',{className:'bk-preview-text'},this.props.widgetFor('body')),
        galleryViews.length>0 && h('section',{className:'bk-preview-gallery'},
          h('h2',{},'Impressionen'),
          h('div',{className:'bk-preview-gallery-grid'},galleryViews)
        )
      );
    }
  });
  window.CMS.registerPreviewStyle('/admin/preview.css');
  window.CMS.registerPreviewTemplate('events',Preview);
}());
