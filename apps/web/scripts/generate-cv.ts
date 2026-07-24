/**
 * Generates the CV as .docx and .pdf directly from src/lib/site.ts, so the
 * downloadable CV can never drift from the website content. Run via
 * `pnpm generate:cv`. Outputs to public/MehmetUnubol_CV.docx and
 * public/MehmetUnubol_CV.pdf, which is what the homepage "Download CV"
 * button links to.
 */
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { site } from "../src/lib/site";

const OUT_DIR = path.join(__dirname, "..", "public");
const DOCX_PATH = path.join(OUT_DIR, "MehmetUnubol_CV.docx");
const PDF_PATH = path.join(OUT_DIR, "MehmetUnubol_CV.pdf");

// pdfkit's built-in Helvetica only covers WinAnsi — it mangles Turkish
// characters (İ, ı, ü, ş, ğ, ç). Embed DejaVu Sans instead, which has full
// Latin Extended coverage.
const FONT_DIR = path.dirname(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"));
const FONTS = {
  regular: path.join(FONT_DIR, "DejaVuSans.ttf"),
  bold: path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
  oblique: path.join(FONT_DIR, "DejaVuSans-Oblique.ttf"),
};

function experienceHeaderLine(exp: (typeof site.experience)[number]): string {
  const tag = exp.tag ? ` (${exp.tag})` : "";
  return `${exp.company} — ${exp.role}${tag}`;
}

function experienceMetaLine(exp: (typeof site.experience)[number]): string {
  return [exp.location, exp.period].filter(Boolean).join(" | ");
}

// ---------- DOCX ----------

function buildDocx(): Document {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: site.name, bold: true })],
    }),
    new Paragraph({
      children: [new TextRun(`${site.location} | ${site.email}`)],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(site.resumeTitle)],
    }),
    new Paragraph({ children: [new TextRun(site.summary)] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Education")],
    })
  );

  for (const edu of site.education) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: `${edu.degree}, `, bold: true }),
          new TextRun(`${edu.school} — ${edu.period}${edu.note ? ` (${edu.note})` : ""}`),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Technical Skills")],
    })
  );

  for (const group of site.skillGroups) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${group.label}: `, bold: true }),
          new TextRun(group.items.join(", ")),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Professional Experience")],
    })
  );

  for (const exp of site.experience) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(experienceHeaderLine(exp))],
      }),
      new Paragraph({
        children: [new TextRun({ text: experienceMetaLine(exp), italics: true })],
      })
    );

    for (const highlight of exp.highlights ?? []) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(highlight)] }));
    }

    if (exp.tech && exp.tech.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Tech: ", bold: true }),
            new TextRun(exp.tech.join(", ")),
          ],
        })
      );
    }
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Freelance & Personal Projects")],
    })
  );

  for (const project of site.projects) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: project.name, bold: true }),
          new TextRun(` — ${project.description}`),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Certifications & Languages")],
    })
  );

  for (const cert of site.certifications) {
    children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(cert)] }));
  }

  for (const language of site.languages) {
    children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(language)] }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: site.availability, bold: true })],
    })
  );

  return new Document({ sections: [{ children }] });
}

async function writeDocx(): Promise<void> {
  const doc = buildDocx();
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(DOCX_PATH, buffer);
}

// ---------- PDF ----------

function writePdf(): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont("Body", FONTS.regular);
    doc.registerFont("Bold", FONTS.bold);
    doc.registerFont("Oblique", FONTS.oblique);

    // DejaVu Sans substitutes "fi"/"fl" with ligature glyphs whose ToUnicode
    // mapping breaks text extraction (ATS parsers, copy-paste): "first" ->
    // "frst". Disable ligature shaping on every .text() call.
    const rawText = doc.text.bind(doc) as (
      text: string,
      options?: Record<string, unknown>
    ) => typeof doc;
    (doc as unknown as { text: unknown }).text = (
      text: string,
      options?: Record<string, unknown>
    ) => rawText(text, { ...options, features: ["-liga", "-rlig"] });

    const stream = fs.createWriteStream(PDF_PATH);
    doc.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);

    doc.fontSize(22).font("Bold").text(site.name);
    doc.fontSize(10).font("Body").text(`${site.location} | ${site.email}`);
    doc.moveDown();

    doc.fontSize(14).font("Bold").text(site.resumeTitle);
    doc.fontSize(10).font("Body").text(site.summary);
    doc.moveDown();

    doc.fontSize(14).font("Bold").text("Education");
    doc.moveDown(0.3);
    for (const edu of site.education) {
      doc
        .fontSize(10)
        .font("Body")
        .text(
          `•  ${edu.degree}, ${edu.school} — ${edu.period}${edu.note ? ` (${edu.note})` : ""}`
        );
    }
    doc.moveDown();

    doc.fontSize(14).font("Bold").text("Technical Skills");
    doc.moveDown(0.3);
    for (const group of site.skillGroups) {
      doc
        .fontSize(10)
        .font("Bold")
        .text(`${group.label}: `, { continued: true })
        .font("Body")
        .text(group.items.join(", "));
    }
    doc.moveDown();

    doc.fontSize(14).font("Bold").text("Professional Experience");
    doc.moveDown(0.3);
    for (const exp of site.experience) {
      doc.fontSize(11).font("Bold").text(experienceHeaderLine(exp));
      doc.fontSize(9).font("Oblique").text(experienceMetaLine(exp));
      doc.moveDown(0.2);
      for (const highlight of exp.highlights ?? []) {
        doc.fontSize(10).font("Body").text(`•  ${highlight}`);
      }
      if (exp.tech && exp.tech.length > 0) {
        doc
          .fontSize(9)
          .font("Bold")
          .text("Tech: ", { continued: true })
          .font("Body")
          .text(exp.tech.join(", "));
      }
      doc.moveDown(0.6);
    }

    doc.fontSize(14).font("Bold").text("Freelance & Personal Projects");
    doc.moveDown(0.3);
    for (const project of site.projects) {
      doc
        .fontSize(10)
        .font("Bold")
        .text(`•  ${project.name}`, { continued: true })
        .font("Body")
        .text(` — ${project.description}`);
    }
    doc.moveDown();

    doc.fontSize(14).font("Bold").text("Certifications & Languages");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Body");
    for (const cert of site.certifications) {
      doc.text(`•  ${cert}`);
    }
    for (const language of site.languages) {
      doc.text(`•  ${language}`);
    }
    doc.moveDown();

    doc.fontSize(10).font("Bold").text(site.availability);

    doc.end();
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await writeDocx();
  await writePdf();
  console.log(`Generated:\n  ${DOCX_PATH}\n  ${PDF_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
