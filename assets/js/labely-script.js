
let pdfDoc = null;
let pageDataList = [];
let partnersFound = new Set();

const TOP_ANCHOR_TEXT = "Customer Address";
const BOTTOM_ANCHOR_TEXT = "Order No.";

// Priority order for partner sorting
const partnerPriority = ["delhivery", "ecom express", "shadowfax", "unknown"];

const fileInput = document.getElementById('fileInput');
const downloadButton = document.getElementById('downloadButton');
const message = document.getElementById('message');
const pagesContainer = document.getElementById('pagesContainer');
const partnerFilter = document.getElementById('partnerFilter');
const sortBySkuCheck = document.getElementById('sortBySku');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resetUI();

    const fileReader = new FileReader();
    fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        try {
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            pdfDoc = await loadingTask.promise;

            message.textContent = "Extracting text and rendering pages, please wait...";
            await analyzeAndRenderAllPages(pdfDoc);
            message.textContent = "";

            // Perform an initial sort (defaults to Partner sort)
            sortPages();

            // Setup partner filter and allow download
            setupPartnerFilter();
            downloadButton.disabled = false;

        } catch (err) {
            message.textContent = "Error loading PDF: " + err.message;
        }
    };
    fileReader.readAsArrayBuffer(file);
});

// Re-sort when "Sort by SKU" checkbox changes
sortBySkuCheck.addEventListener('change', sortPages);

// Re-filter the visible pages if the partnerFilter is changed
partnerFilter.addEventListener('change', () => {
    filterPages(partnerFilter.value);
});

/**
 * Analyzes each page for anchor text, partner, and SKU,
 * then renders a canvas preview.
 */
async function analyzeAndRenderAllPages(pdfDoc) {
    const numPages = pdfDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.5 });

        // console.log(\n === Processing Page ${ i } ===);

        // Render canvas preview
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;

        // Create a wrapper for display
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'pageWrapper';
        pageWrapper.appendChild(canvas);
        pagesContainer.appendChild(pageWrapper);

        // Extract details including SKU
        const { topY, bottomY, partner, sku } = findPageDetails(textContent, i);

        // console.log(🛒 SKU for Page ${ i }:, sku ? sku : "❌ Not Found");
        // console.log(🚚 Partner for Page ${ i }:, partner ? partner : "❌ Not Found");

        // Store data
        pageDataList.push({
            pageIndex: i - 1,
            partner: partner || "Unknown",
            sku: sku || "N/A",
            cropRegion: calculateCropRegion(topY, bottomY, viewport.height),
            pageWrapper,
        });
    }

    filterPages("all");
}

/**
 * Extract SKU and Delivery Partner details from the text content of each page.
 */
function findPageDetails(textContent, pageIndex) {
    let topY = null, bottomY = null;
    let partner = null;
    let sku = null;
    let skuLineIndex = -1; // Stores the index where "SKU" appears

    // console.log(\n📜 Page ${ pageIndex } - Extracting Text: \n);

    textContent.items.forEach((item, index) => {
        const text = item.str.trim();
        const y = item.transform[5]; // Y-coordinate for reference
        // console.log(📝 Line ${ index + 1}:, text);

    // Detect anchors for cropping logic
    if (text.includes(TOP_ANCHOR_TEXT)) topY = y;
    if (text.includes(BOTTOM_ANCHOR_TEXT)) bottomY = y;

    // Detect delivery partner
    if (text.toLowerCase().includes("delhivery")) partner = "Delhivery";
    else if (text.toLowerCase().includes("ecom express")) partner = "Ecom Express";
    else if (text.toLowerCase().includes("shadowfax")) partner = "Shadowfax";

    // Step 1: Detect "SKU" label and store its line number
    if (text.toLowerCase() === "sku") {
        skuLineIndex = index; // Store the line number for later search
        console.log("🔍 Found 'SKU' label at Line", index + 1);
    }

    // Step 2: If SKU label was found, check if we're exactly 9 lines ahead
    if (skuLineIndex !== -1 && index === skuLineIndex + 9) {
        sku = text;
        console.log("✔ Found SKU Value at Line", index + 1, ":", sku);
        skuLineIndex = -1; // Reset after finding SKU
    }
});

return { topY, bottomY, partner, sku };
}


function calculateCropRegion(topY, bottomY, pageHeight) {
    if (topY != null && bottomY != null) {
        // Ensure topY < bottomY if they appear reversed
        const y1 = pageHeight + 26 - Math.max(topY, bottomY);
        const y2 = pageHeight - Math.min(topY, bottomY);
        // Standard PDF width = ~595 for A4, but adjust to suit your needs
        return { x: 0, y: y1, w: 595, h: y2 - y1 };
    }
    // Fallback: no anchors found
    return { x: 0, y: 0, w: 595, h: pageHeight };
}

/**
 * Sort pages either by SKU (if checkbox is checked) or by partner.
 * Then re-append them to the container and re-apply the active partner filter.
 */
function sortPages() {
    if (sortBySkuCheck.checked) {
        // Sort by SKU alphabetically
        pageDataList.sort((a, b) => a.sku.localeCompare(b.sku));
    } else {
        // Sort by partner priority
        pageDataList.sort((a, b) => {
            const aIndex = partnerPriority.indexOf(a.partner.toLowerCase());
            const bIndex = partnerPriority.indexOf(b.partner.toLowerCase());
            return aIndex - bIndex;
        });
    }
    // Re-attach in the new sorted order
    pageDataList.forEach(item => pagesContainer.appendChild(item.pageWrapper));

    // Re-filter to maintain the current partner filter
    filterPages(partnerFilter.value);
}

/**
 * Show only the pages with the matching partner (or all if 'all').
 */
function filterPages(value) {
    pageDataList.forEach((data) => {
        const partner = data.partner.toLowerCase();
        if (value === 'all' || partner === value) {
            data.pageWrapper.style.display = 'inline-block';
        } else {
            data.pageWrapper.style.display = 'none';
        }
    });
}

/**
 * Populate the partnerFilter <select> with the found partners.
 */
function setupPartnerFilter() {
    if (partnersFound.size > 0) {
        partnerFilter.disabled = false;
        partnerFilter.style.display = "inline-block";
        for (const p of partnersFound) {
            const opt = document.createElement('option');
            opt.value = p.toLowerCase();
            opt.textContent = p;
            partnerFilter.appendChild(opt);
        }
    }
}

/**
 * Download the final cropped PDF in the currently sorted order.
 */
downloadButton.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    const croppedPdf = await PDFLib.PDFDocument.create();

    // Use pageDataList in its current sorted order
    for (let { pageIndex, cropRegion } of pageDataList) {
        const [copiedPage] = await croppedPdf.copyPages(pdfLibDoc, [pageIndex]);
        copiedPage.setCropBox(
            cropRegion.x,
            cropRegion.y,
            cropRegion.x + cropRegion.w,
            cropRegion.y + cropRegion.h
        );
        croppedPdf.addPage(copiedPage);
    }

    const pdfBytes = await croppedPdf.save();
    downloadPDF(pdfBytes, 'lebely-cropped.pdf');
});

function downloadPDF(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

/**
 * Reset UI for new PDF uploads.
 */
function resetUI() {
    message.textContent = '';
    pagesContainer.innerHTML = '';
    pageDataList = [];
    partnersFound.clear();
    partnerFilter.innerHTML = '<option value="all">All</option>';
    partnerFilter.disabled = true;
    partnerFilter.style.display = "none";
    sortBySkuCheck.checked = false;
    downloadButton.disabled = true;
}
