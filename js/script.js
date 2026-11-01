const revealElements = document.querySelectorAll(".reveal");
const topBtn = document.getElementById("topBtn");
const skillSlides = document.querySelectorAll(".skill-slide");
const skillDots = document.querySelectorAll(".skill-dot");
const sampleGrid = document.getElementById("writingSampleGrid");
const sampleCount = document.getElementById("sampleCount");
const sampleError = document.getElementById("sampleError");
const certificateGroups = document.getElementById("certificateGroups");
const certificateError = document.getElementById("certificateError");
const recommendationLetter = document.getElementById("recommendationLetter");
const categoryFilters = document.querySelectorAll("[data-category-filter]");
const languageFilters = document.querySelectorAll("[data-language-filter]");
const writingDialog = document.getElementById("writingDialog");
const dialogCategory = document.getElementById("dialogCategory");
const dialogLanguages = document.getElementById("dialogLanguages");
const dialogContent = document.getElementById("dialogContent");
const dialogReviewNote = document.getElementById("dialogReviewNote");
const dialogSourceLink = document.getElementById("dialogSourceLink");
const closeDialog = document.getElementById("closeDialog");
const writingSamples = Array.isArray(window.writingSamples) ? window.writingSamples : [];
const certificateData = window.certificateData;
const writingCategories = [
  "Branding Content",
  "Marketing Content",
  "Blogs",
  "Knowledge Sharing"
];
let selectedCategory = "all";
let selectedLanguage = "all";

function rotateSkills() {
  if (!skillSlides.length || skillSlides.length !== skillDots.length) return;

  let activeIndex = Array.from(skillSlides).findIndex((slide) => slide.classList.contains("active"));
  if (activeIndex < 0) activeIndex = 0;

  skillSlides[activeIndex].classList.remove("active");
  skillDots[activeIndex].classList.remove("active");

  const nextIndex = (activeIndex + 1) % skillSlides.length;
  skillSlides[nextIndex].classList.add("active");
  skillDots[nextIndex].classList.add("active");
}

if (skillSlides.length > 1 && skillSlides.length === skillDots.length) {
  window.setInterval(rotateSkills, 2400);
}

function revealOnScroll() {
  revealElements.forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight - 100) {
      element.classList.add("active");
    }
  });
}

window.addEventListener("scroll", () => {
  revealOnScroll();

  if (topBtn) {
    topBtn.style.display = window.scrollY > 400 ? "block" : "none";
  }
});

revealOnScroll();

if (topBtn) {
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function getDisplayLanguages(sample) {
  return sample.languages.length > 1 ? ["Both"] : sample.languages;
}

function appendLanguageBadges(container, languages) {
  container.replaceChildren();

  languages.forEach((language) => {
    const badge = document.createElement("span");
    badge.className = `language-badge ${language.toLowerCase()}`;
    badge.lang = language === "Burmese" || language === "Both" ? "my" : "en";
    badge.textContent = language;
    container.append(badge);
  });
}

function getExtractionReview(sample) {
  let nulCount = 0;
  let replacementCount = 0;
  let privateUseCount = 0;
  const affectedPages = new Set();

  sample.fragments.forEach(({ page, text }) => {
    let pageHasIssue = false;
    for (const character of text) {
      const codePoint = character.codePointAt(0);
      if (codePoint === 0) {
        nulCount += 1;
        pageHasIssue = true;
      } else if (codePoint === 0xfffd) {
        replacementCount += 1;
        pageHasIssue = true;
      } else if (
        (codePoint >= 0xe000 && codePoint <= 0xf8ff)
        || (codePoint >= 0xf0000 && codePoint <= 0xffffd)
        || (codePoint >= 0x100000 && codePoint <= 0x10fffd)
      ) {
        privateUseCount += 1;
        pageHasIssue = true;
      }
    }
    if (pageHasIssue) affectedPages.add(page);
  });

  if (!nulCount && !replacementCount && !privateUseCount) return "";

  const issues = [];
  if (nulCount) issues.push(`${nulCount} U+0000 extraction placeholders`);
  if (replacementCount) issues.push(`${replacementCount} replacement characters`);
  if (privateUseCount) issues.push(`${privateUseCount} private-use glyphs`);

  const pages = Array.from(affectedPages).sort((a, b) => a - b).join(", ");
  return `PDF text extraction is incomplete: ${issues.join(" and ")} on page${affectedPages.size === 1 ? "" : "s"} ${pages}. Please verify this sample against the source PDF.`;
}

function samplePreview(sample) {
  const firstFragment = sample.fragments.find(({ text }) => text.length > 0);
  if (!firstFragment) return "";

  const characters = Array.from(firstFragment.text);
  return `${characters.slice(0, 220).join("")}${characters.length > 220 ? "…" : ""}`;
}

function getVisibleSamples() {
  return writingSamples.filter((sample) => {
    const matchesCategory = selectedCategory === "all" || sample.category === selectedCategory;
    const matchesLanguage = selectedLanguage === "all" || sample.languages.includes(selectedLanguage);
    return matchesCategory && matchesLanguage;
  });
}

function createSampleCard(sample) {
  const card = document.createElement("article");
  card.className = "sample-card reveal active";

  const category = document.createElement("p");
  category.className = "sample-tag";
  category.textContent = sample.category;

  const title = sample.title ? document.createElement("h3") : null;
  if (title) {
    title.textContent = sample.title;
    title.lang = "en";
  }

  const languages = document.createElement("div");
  languages.className = "language-tags";
  appendLanguageBadges(languages, getDisplayLanguages(sample));

  const preview = document.createElement("p");
  preview.className = "sample-preview";
  preview.lang = sample.languages.includes("Burmese") ? "my" : "en";
  preview.textContent = samplePreview(sample);

  card.append(category);
  if (title) card.append(title);
  card.append(languages, preview);

  const extractionReview = getExtractionReview(sample);
  if (extractionReview) {
    const reviewFlag = document.createElement("p");
    reviewFlag.className = "sample-review-flag";
    reviewFlag.textContent = extractionReview;
    card.append(reviewFlag);
  }

  const readMore = document.createElement("button");
  readMore.className = "read-more-button";
  readMore.type = "button";
  readMore.textContent = "Read More";
  readMore.setAttribute("aria-haspopup", "dialog");
  readMore.addEventListener("click", () => openSample(sample));
  card.append(readMore);

  return card;
}

function updateFilterButtons(buttons, selectedButton) {
  buttons.forEach((button) => {
    const selected = button === selectedButton;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderSamples() {
  const visibleSamples = getVisibleSamples();
  sampleGrid.replaceChildren(...visibleSamples.map(createSampleCard));
  sampleCount.textContent = `${visibleSamples.length} of ${writingSamples.length} writing samples`;
  revealOnScroll();
}

function createCertificateCard(certificate) {
  const card = document.createElement("article");
  card.className = "certificate-card";

  const preview = document.createElement("div");
  preview.className = "certificate-preview";
  const fileUrl = encodeURI(certificate.file);
  const previewFile = certificate.preview || certificate.file;

  if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(previewFile)) {
    const image = document.createElement("img");
    image.src = encodeURI(previewFile);
    image.alt = certificate.name ? `Certificate: ${certificate.name}` : "Certificate image";
    preview.append(image);
  } else {
    const fileIcon = document.createElement("i");
    fileIcon.className = "bi bi-file-earmark-pdf";
    fileIcon.setAttribute("aria-hidden", "true");
    preview.append(fileIcon);
  }

  const details = document.createElement("div");
  details.className = "certificate-details";

  if (certificate.name) {
    const title = document.createElement("h4");
    title.textContent = certificate.name;
    details.append(title);
  }

  if (certificate.description) {
    const description = document.createElement("p");
    description.className = "certificate-description";
    description.textContent = certificate.description;
    details.append(description);
  }

  if (certificate.issuer || certificate.date) {
    const metadata = document.createElement("p");
    metadata.className = "certificate-metadata";
    metadata.textContent = [certificate.issuer, certificate.date].filter(Boolean).join(" · ");
    details.append(metadata);
  }

  const viewLink = document.createElement("a");
  viewLink.className = "btn secondary-btn certificate-view-button";
  viewLink.href = fileUrl;
  viewLink.target = "_blank";
  viewLink.rel = "noreferrer";
  viewLink.textContent = "View Certificate";
  details.append(viewLink);

  card.append(preview, details);
  return card;
}

function renderRecommendationLetter() {
  if (!recommendationLetter) return;

  const section = document.createElement("section");
  section.className = "certificate-group recommendation-group";
  section.setAttribute("aria-labelledby", "recommendation-letter-heading");

  const heading = document.createElement("h3");
  heading.id = "recommendation-letter-heading";
  heading.textContent = "Recommendation Letter";
  section.append(heading);

  if (certificateData.recommendationLetter?.file) {
    const letter = certificateData.recommendationLetter;
    const card = document.createElement("article");
    card.className = "certificate-card recommendation-card";

    const preview = document.createElement("div");
    preview.className = "certificate-preview recommendation-preview";
    const icon = document.createElement("i");
    icon.className = "bi bi-file-earmark-pdf";
    icon.setAttribute("aria-hidden", "true");
    preview.append(icon);

    const details = document.createElement("div");
    details.className = "certificate-details";
    const title = document.createElement("h4");
    title.textContent = letter.name || "Recommendation Letter";
    const link = document.createElement("a");
    link.className = "btn secondary-btn certificate-view-button";
    link.href = encodeURI(letter.file);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "View Recommendation Letter";
    details.append(title, link);
    card.append(preview, details);
    section.append(card);
  } else {
    const emptyState = document.createElement("p");
    emptyState.className = "certificate-empty-state";
    emptyState.textContent = "No recommendation letter PDF has been added yet.";
    section.append(emptyState);
  }

  recommendationLetter.replaceChildren(section);
}

function renderCertificates() {
  if (!certificateGroups || !certificateError) return;

  if (
    !certificateData
    || !Array.isArray(certificateData.categories)
    || !Array.isArray(certificateData.items)
  ) {
    console.error("Certificate data was not loaded or has an invalid structure.");
    certificateError.hidden = false;
    certificateError.textContent = "Certificates could not be displayed. Check that the certificate data file is present and valid.";
    return;
  }

  const categoryIds = new Set(certificateData.categories.map(({ id }) => id));
  const invalidItems = certificateData.items.filter((item) => (
    !item
    || !categoryIds.has(item.category)
    || typeof item.file !== "string"
    || !item.file.trim()
  ));

  if (invalidItems.length) {
    console.error("Some certificate records are invalid.", invalidItems);
    certificateError.hidden = false;
    certificateError.textContent = "Some certificates could not be displayed because their category or original file path is missing.";
  }

  const groups = certificateData.categories.map((category) => {
    const section = document.createElement("section");
    section.className = "certificate-group reveal active";
    section.setAttribute("aria-labelledby", `certificate-category-${category.id}`);

    const heading = document.createElement("h3");
    heading.id = `certificate-category-${category.id}`;
    heading.textContent = category.name;
    section.append(heading);

    const items = certificateData.items.filter((item) => (
      item
      && item.category === category.id
      && typeof item.file === "string"
      && item.file.trim()
    ));

    if (items.length) {
      const grid = document.createElement("div");
      grid.className = "certificate-card-grid";
      grid.append(...items.map(createCertificateCard));
      section.append(grid);
    } else {
      const emptyState = document.createElement("p");
      emptyState.className = "certificate-empty-state";
      emptyState.textContent = "No original certificates added yet.";
      section.append(emptyState);
    }

    return section;
  });

  certificateGroups.replaceChildren(...groups);
  renderRecommendationLetter();
}

function classifyLanguage(line, fallback) {
  const burmeseCount = (line.match(/\p{Script=Myanmar}/gu) || []).length;
  const englishCount = (line.match(/[A-Za-z]/g) || []).length;

  if (burmeseCount && englishCount) return "Both";
  if (burmeseCount) return "Burmese";
  if (englishCount) return "English";
  return fallback;
}

function createLanguageSections(text) {
  const sections = [];
  const lines = text.split("\n");
  let activeLanguage = "Burmese";

  lines.forEach((line, index) => {
    const lineText = `${line}${index < lines.length - 1 ? "\n" : ""}`;
    const detectedLanguage = classifyLanguage(line, activeLanguage);
    activeLanguage = detectedLanguage;

    let section = sections[sections.length - 1];
    if (!section || section.language !== activeLanguage) {
      section = { language: activeLanguage, text: "" };
      sections.push(section);
    }
    section.text += lineText;
  });

  return sections;
}

function createOriginalFragment(fragment, sample) {
  const page = document.createElement("section");
  page.className = "dialog-source-page";

  if (sample.languages.length > 1) {
    createLanguageSections(fragment.text).forEach(({ language, text }) => {
      const section = document.createElement("div");
      section.className = "dialog-language-section";

      const label = document.createElement("p");
      label.className = "dialog-language-label";
      label.textContent = language === "Both" ? "Burmese and English" : language;

      const originalText = document.createElement("pre");
      originalText.className = "dialog-original-text";
      originalText.lang = language === "English" ? "en" : "my";
      originalText.textContent = text;

      section.append(label, originalText);
      page.append(section);
    });
  } else {
    const originalText = document.createElement("pre");
    originalText.className = "dialog-original-text";
    originalText.lang = sample.languages.includes("Burmese") ? "my" : "en";
    originalText.textContent = fragment.text;
    page.append(originalText);
  }

  return page;
}

function openSample(sample) {
  dialogCategory.textContent = sample.category;
  appendLanguageBadges(dialogLanguages, getDisplayLanguages(sample));
  dialogContent.replaceChildren(...sample.fragments.map((fragment) => createOriginalFragment(fragment, sample)));

  const extractionReview = getExtractionReview(sample);
  dialogReviewNote.hidden = !extractionReview;
  dialogReviewNote.textContent = extractionReview;
  dialogSourceLink.href = `public/documents/My%20Content.pdf#page=${sample.fragments[0].page}`;
  writingDialog.showModal();
}

categoryFilters.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.categoryFilter;
    updateFilterButtons(categoryFilters, button);
    renderSamples();
  });
});

languageFilters.forEach((button) => {
  button.addEventListener("click", () => {
    selectedLanguage = button.dataset.languageFilter;
    updateFilterButtons(languageFilters, button);
    renderSamples();
  });
});

if (closeDialog) {
  closeDialog.addEventListener("click", () => writingDialog.close());
}

if (writingDialog) {
  writingDialog.addEventListener("click", (event) => {
    const bounds = writingDialog.getBoundingClientRect();
    const clickedBackdrop = event.clientX < bounds.left
      || event.clientX > bounds.right
      || event.clientY < bounds.top
      || event.clientY > bounds.bottom;

    if (clickedBackdrop) writingDialog.close();
  });
}

if (sampleGrid && sampleCount && sampleError) {
  const invalidCategories = Array.from(new Set(
    writingSamples
      .map(({ category }) => category)
      .filter((category) => !writingCategories.includes(category))
  ));

  if (invalidCategories.length) {
    console.error("Writing samples use unsupported categories.", invalidCategories);
    sampleCount.textContent = "Writing samples are unavailable.";
    sampleError.hidden = false;
    sampleError.textContent = "Some writing samples could not be displayed because their category data is invalid.";
  } else if (!writingSamples.length) {
    console.error("Writing sample data was not loaded or contains no samples.");
    sampleCount.textContent = "Writing samples are unavailable.";
    sampleError.hidden = false;
    sampleError.textContent = "The writing samples could not be loaded. Check that the JavaScript data file is present.";
  } else {
    renderSamples();
  }
}

renderCertificates();

function sendMessage(event) {
  event.preventDefault();

  const formMessage = document.getElementById("formMessage");
  if (formMessage) {
    formMessage.textContent = "Thank you for reaching out — this demo form is ready for your preferred email service.";
  }

  event.target.reset();
}
