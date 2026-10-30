backend:
  name: github
  repo: Baukarussell/baukarussell-webseite
  branch: main
  base_url: https://baukarussell-webseite.pages.dev

media_folder: "logos" 
public_folder: "/logos"

collections:
  - name: "events"
    label: "Events"
    folder: "events"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Titel", name: "title", widget: "string"}
      - {label: "Datum", name: "date", widget: "datetime"}
      - {label: "Titelbild", name: "image", widget: "image"}
      - {label: "Text", name: "body", widget: "markdown"}

  - name: "projekte"
    label: "Projekte"
    folder: "projekte"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Titel", name: "title", widget: "string"}
      - {label: "Datum", name: "date", widget: "datetime"}
      - {label: "Bild", name: "image", widget: "image"}
      - {label: "Beschreibung", name: "body", widget: "markdown"}

  - name: "mitglieder"
    label: "Mitglieder"
    folder: "mitglieder"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Firmenname", name: "title", widget: "string"}
      - {label: "Logo", name: "logo", widget: "image"}
      - {label: "Beschreibung", name: "body", widget: "markdown"}
