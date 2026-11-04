const fs = require("node:fs/promises");
const path = require("node:path");
const matter = require("gray-matter");
const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");
marked.setOptions({ gfm: true, breaks: false });

function plain(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlFromMarkdown(value) {
  return sanitizeHtml(marked.parse(String(value || "")), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"]
  });
}

function cleanDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function readCollection(folder) {
  const dir = path.join(ROOT, folder);
  let files = [];
  try { files = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }

  const records = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.toLowerCase().endsWith(".md")) continue;
    const content = await fs.readFile(path.join(dir, file.name), "utf8");
    const parsed = matter(content);
    const body = parsed.content.trim();
    const record = { ...parsed.data, slug: path.basename(file.name, ".md") };
    record.date = cleanDate(record.date);
    record.bodyHtml = htmlFromMarkdown(body);
    record.bodyText = plain(record.bodyHtml);
    records.push(record);
  }
  return records;
}

function detailShell(type) {
  const css = "*{box-sizing:border-box}body{margin:0;background:#faf8f5;color:#333;font:16px/1.7 Inter,Arial,sans-serif}h1,h2,h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:400}nav{position:sticky;top:0;background:#faf8f5;padding:18px 6%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;z-index:2}.brand{font:30px 'Cormorant Garamond',Georgia,serif;letter-spacing:.12em;color:#1a1a1a;text-decoration:none}.back{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1a1a1a;text-decoration:none}.hero{height:62vh;min-height:340px;position:relative;background:#222;overflow:hidden}.hero img{width:100%;height:100%;object-fit:cover}.hero:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(0,0,0,.75))}.hero-copy{position:absolute;left:7%;right:7%;bottom:42px;color:white;z-index:1}.meta{color:#d4b483;letter-spacing:.25em;font-size:12px;text-transform:uppercase}.hero h1{font-size:clamp(30px,4vw,58px);line-height:1.1;margin:10px 0}.content{max-width:900px;margin:0 auto;padding:70px 6%}.content h2{text-align:center;font-size:34px;margin:0 0 25px}.content p{line-height:1.9;margin:0 0 20px;color:#444;text-align:justify}.location{text-align:center;color:#b8945f;letter-spacing:.1em;margin-bottom:25px}.panel{max-width:900px;margin:0 auto 55px;background:#fff;padding:35px;border-left:3px solid #b8945f}.panel h2{margin:0 0 20px}.row{display:grid;grid-template-columns:140px 1fr auto;gap:15px;padding:12px 0;border-bottom:1px solid #eee}.row span{color:#b8945f;text-transform:uppercase;font-size:12px}.gallery{max-width:1100px;margin:0 auto 65px;padding:0 6%}.gallery h2{text-align:center;font-size:34px}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.gallery-grid img{width:100%;aspect-ratio:4/3;object-fit:cover}.memberbox{display:flex;justify-content:space-between;align-items:center;gap:25px;background:#fff;padding:30px;margin-top:45px;border-left:3px solid #b8945f}.memberbox img{max-width:170px;max-height:90px;object-fit:contain}.profile{max-width:1150px;margin:80px auto;display:grid;grid-template-columns:minmax(220px,360px) 1fr;gap:55px;padding:0 6%;align-items:center}.profile-photo{width:100%;max-height:470px;object-fit:cover}.profile-logo{max-width:220px;max-height:110px;object-fit:contain}.tagline{font:italic 24px 'Cormorant Garamond',Georgia,serif;color:#b8945f}.contact{background:#fff;padding:45px 6%;display:grid;grid-template-columns:1fr 1fr;gap:35px;align-items:center}.contact-logo{max-width:280px;max-height:130px;object-fit:contain}.quote{background:#1a1a1a;color:#d4b483;text-align:center;padding:45px;font:italic 28px 'Cormorant Garamond',Georgia,serif}footer{background:#1a1a1a;color:#fff;text-align:center;padding:35px}footer a{color:#fff;text-decoration:none;margin:0 12px;font-size:11px;text-transform:uppercase;letter-spacing:.12em}@media(max-width:800px){nav{padding:13px 22px}.brand{font-size:22px}.hero{height:48vh}.hero-copy{left:25px;right:25px;bottom:24px}.content{padding:45px 25px}.content p{text-align:left}.row{grid-template-columns:1fr;gap:3px}.gallery-grid{grid-template-columns:repeat(2,1fr)}.memberbox,.profile,.contact{display:block;padding:28px 25px}.profile{margin:45px auto}.profile-photo{max-width:360px;margin-bottom:25px}.memberbox img,.contact-logo{display:block;margin-top:20px;max-width:140px}}";
  return "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Baukarussell</title><link href=\"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap\" rel=\"stylesheet\"><style>" +
    css + "</style></head><body><nav><a class=\"brand\" href=\"../index.html\">BAUKARUSSELL</a><a class=\"back\" href=\"../index.html\">Zurück zur Übersicht</a></nav><main id=\"cms-detail\" data-cms-type=\"" +
    type + "\"></main><footer><a href=\"../index.html\">Startseite</a><a href=\"../events.html\">Events</a><a href=\"../projekte.html\">Projekte</a><a href=\"../index.html#contact\">Kontakt</a></footer><script src=\"../cms-render.js\"></script></body></html>";
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.cp(ROOT, OUT, {
    recursive: true,
    filter(source) {
      const relative = path.relative(ROOT, source);
      if (!relative) return true;
      const parts = relative.split(path.sep);
      if ([".git", "node_modules", "dist", "scripts", ".github", ".wrangler", "functions"].includes(parts[0])) return false;
      if (["package.json", "package-lock.json", "README.md", ".gitignore"].includes(parts[0])) return false;
      if (["events", "projekte", "mitglieder"].includes(parts[0]) && relative.toLowerCase().endsWith(".md")) return false;
      return true;
    }
  });

  const [events, projects, members] = await Promise.all([
    readCollection("events"), readCollection("projekte"), readCollection("mitglieder")
  ]);
  const sortDate = (a, b) => new Date(b.date || 0) - new Date(a.date || 0);
  events.sort(sortDate);
  projects.sort(sortDate);
  members.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "de-CH"));

  await fs.writeFile(path.join(OUT, "cms-data.json"), JSON.stringify({ events, projects, members }, null, 2), "utf8");

  for (const event of events) {
    await fs.mkdir(path.join(OUT, "events"), { recursive: true });
    await fs.writeFile(path.join(OUT, "events", event.slug + ".html"), detailShell("event"), "utf8");
  }
  for (const project of projects) {
    await fs.mkdir(path.join(OUT, "projekte"), { recursive: true });
    await fs.writeFile(path.join(OUT, "projekte", project.slug + ".html"), detailShell("project"), "utf8");
  }
  for (const member of members) {
    await fs.mkdir(path.join(OUT, "mitglieder"), { recursive: true });
    await fs.writeFile(path.join(OUT, "mitglieder", member.slug + ".html"), detailShell("member"), "utf8");
  }

  for (const page of ["index.html", "events.html", "projekte.html"]) {
    const target = path.join(OUT, page);
    let html = await fs.readFile(target, "utf8");
    if (!html.includes("cms-render.js")) {
      html = html.replace("</body>", "<script src=\"cms-render.js\"></script>\n</body>");
      await fs.writeFile(target, html, "utf8");
    }
  }

  console.log("CMS build complete: " + events.length + " events, " + projects.length + " projects, " + members.length + " members.");
}

main().catch((error) => {
  console.error("CMS build failed:", error);
  process.exitCode = 1;
});
