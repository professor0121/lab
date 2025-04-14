
let pdfDoc = null,
    pageDataList = [],
    partnersFound = new Set(),
    TOP_ANCHOR_TEXT = "Customer Address",
    BOTTOM_ANCHOR_TEXT = "Order No.",
    partnerPriority = ["delhivery", "ecom express", "shadowfax", "unknown"];

const fileInput = document.getElementById("fileInput"),
    downloadButton = document.getElementById("downloadButton"),
    message = document.getElementById("message"),
    pagesContainer = document.getElementById("pagesContainer"),
    partnerFilter = document.getElementById("partnerFilter"),
    progressBar = document.getElementById("progressBar");

// Listen to changes on the sortBy radio buttons.
document.querySelectorAll('input[name="sortBy"]').forEach(radio => {
    radio.addEventListener("change", sortPages);
});

fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    resetUI();
    progressBar.value = 0;
    const fileReader = new FileReader();
    fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        try {
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            pdfDoc = await loadingTask.promise;
            message.textContent = "Extracting text and rendering pages, please wait...";
            await analyzeAndRenderAllPages(pdfDoc);
            sortPages();
            setupPartnerFilter();
            progressBar.value = 100;
            message.textContent = "Processing complete. You can now download the PDF.";
            downloadButton.disabled = false;
        } catch (err) {
            message.textContent = "Error loading PDF: " + err.message;
        }
    };
    fileReader.readAsArrayBuffer(file);
});

partnerFilter.addEventListener("change", () => {
    filterPages(partnerFilter.value);
});

async function analyzeAndRenderAllPages(pdfDoc) {
    const numPages = pdfDoc.numPages;
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const pageWrapper = document.createElement("div");
        pageWrapper.className = "pageWrapper";
        pageWrapper.appendChild(canvas);
        pagesContainer.appendChild(pageWrapper);
        const { topY, bottomY, partner, sku } = findPageDetails(textContent, i);
        pageDataList.push({
            pageIndex: i - 1,
            partner: partner || "Unknown",
            sku: sku || "N/A",
            cropRegion: calculateCropRegion(topY, bottomY, viewport.height),
            pageWrapper
        });
        progressBar.value = 10 + (i / numPages) * 50;
        await new Promise(r => setTimeout(r, 10));
    }
    filterPages("all");
}

function findPageDetails(textContent, pageIndex) {
    let topY = null,
        bottomY = null,
        partner = null,
        sku = null,
        skuLineIndex = -1;
    textContent.items.forEach((item, index) => {
        const text = item.str.trim(), y = item.transform[5];
        if (text.includes(TOP_ANCHOR_TEXT)) topY = y;
        if (text.includes(BOTTOM_ANCHOR_TEXT)) bottomY = y;
        if (text.toLowerCase().includes("delhivery"))
            partner = "Delhivery";
        else if (text.toLowerCase().includes("ecom express"))
            partner = "Ecom Express";
        else if (text.toLowerCase().includes("shadowfax"))
            partner = "Shadowfax";
        if (text.toLowerCase() === "sku") skuLineIndex = index;
        if (skuLineIndex !== -1 && index === skuLineIndex + 9) {
            sku = text;
            skuLineIndex = -1;
        }
        if (partner) partnersFound.add(partner);
    });
    return { topY, bottomY, partner, sku };
}

function calculateCropRegion(topY, bottomY, pageHeight) {
    if (topY != null && bottomY != null) {
        const y1 = pageHeight + 26 - Math.max(topY, bottomY),
            y2 = pageHeight - Math.min(topY, bottomY);
        return { x: 0, y: y1, w: 595, h: y2 - y1 };
    }
    return { x: 0, y: 0, w: 595, h: pageHeight };
}

function sortPages() {
    const sortBy = document.querySelector('input[name="sortBy"]:checked').value;
    if (sortBy === "sku") {
        pageDataList.sort((a, b) => a.sku.localeCompare(b.sku));
    } else {
        pageDataList.sort((a, b) => {
            const aIndex = partnerPriority.indexOf(a.partner.toLowerCase()),
                bIndex = partnerPriority.indexOf(b.partner.toLowerCase());
            return aIndex - bIndex;
        });
    }
    pageDataList.forEach(item => pagesContainer.appendChild(item.pageWrapper));
    filterPages(partnerFilter.value);
}

function filterPages(value) {
    pageDataList.forEach(data => {
        const partner = data.partner.toLowerCase();
        data.pageWrapper.style.display = (value === "all" || partner === value) ? "inline-block" : "none";
    });
}

function setupPartnerFilter() {
    if (partnersFound.size > 0) {
        partnerFilter.disabled = false;
        partnerFilter.style.display = "inline-block";
        for (const p of partnersFound) {
            const opt = document.createElement("option");
            opt.value = p.toLowerCase();
            opt.textContent = p;
            partnerFilter.appendChild(opt);
        }
    }
}

downloadButton.addEventListener("click", async () => {
    try {
        const file = fileInput.files[0];
        const arrayBuffer = await file.arrayBuffer();
        const layoutMode = document.querySelector('input[name="layoutMode"]:checked').value;

        // Load the source PDF
        const pdfBytes = new Uint8Array(arrayBuffer);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        // Create a new PDF for the output
        const outputPdf = await PDFLib.PDFDocument.create();

        // Get pages from source PDF
        const pages = pdfDoc.getPages();

        if (layoutMode === "label") {
            // Label printer mode - one label per page, cropped to size
            for (let i = 0; i < pageDataList.length; i++) {
                const { pageIndex, cropRegion } = pageDataList[i];

                // Copy the page to the new document
                const [copiedPage] = await outputPdf.copyPages(pdfDoc, [pageIndex]);

                // Set crop box and add the page
                copiedPage.setCropBox(
                    cropRegion.x,
                    cropRegion.y,
                    cropRegion.w,
                    cropRegion.h
                );
                outputPdf.addPage(copiedPage);

                progressBar.value = 60 + (((i + 1) / pageDataList.length) * 20);
                await new Promise(r => setTimeout(r, 10));
            }
        } else {
            // A4 layout in LANDSCAPE orientation for better space utilization
            // Swap width and height for landscape orientation
            const a4Height = 595;  // A4 width becomes height in landscape
            const a4Width = 842;   // A4 height becomes width in landscape

            // Small margin for better appearance
            const margin = 10;
            const cellGap = 10;

            // Calculate cell dimensions for a 2x2 grid in landscape orientation
            const cellWidth = (a4Width - (2 * margin) - cellGap) / 2;
            const cellHeight = (a4Height - (2 * margin) - cellGap) / 2;

            let pageCount = 0;
            for (let i = 0; i < pageDataList.length; i += 4) {
                // Create a landscape A4 page
                const a4Page = outputPdf.addPage([a4Width, a4Height]);
                pageCount++;

                for (let j = 0; j < 4 && (i + j) < pageDataList.length; j++) {
                    const index = i + j;
                    const { pageIndex, cropRegion } = pageDataList[index];

                    // Calculate grid position (0,0 is bottom-left in PDF coordinates)
                    const col = j % 2;
                    const row = 1 - Math.floor(j / 2); // Invert row to start from top

                    // Calculate cell position
                    const xPosition = margin + (col * (cellWidth + cellGap));
                    const yPosition = a4Height - margin - cellHeight - (row * (cellHeight + cellGap));

                    // Extract the crop region as an embedded page
                    const embeddedPage = await outputPdf.embedPage(pages[pageIndex], {
                        left: cropRegion.x,
                        bottom: cropRegion.y,
                        right: cropRegion.x + cropRegion.w,
                        top: cropRegion.y + cropRegion.h
                    });

                    // Get the dimensions of the actual label content
                    const labelWidth = cropRegion.w;
                    const labelHeight = cropRegion.h;

                    // Determine if the label should be drawn in landscape or portrait orientation
                    // Most shipping labels work better in landscape
                    // Calculate both scaling options and pick the one that makes better use of space

                    // Option 1: No rotation
                    const scaleDirectX = cellWidth / labelWidth;
                    const scaleDirectY = cellHeight / labelHeight;
                    const scaleDirectMin = Math.min(scaleDirectX, scaleDirectY);
                    const directArea = (labelWidth * scaleDirectMin) * (labelHeight * scaleDirectMin);

                    // Option 2: With 90-degree rotation
                    const scaleRotatedX = cellWidth / labelHeight;
                    const scaleRotatedY = cellHeight / labelWidth;
                    const scaleRotatedMin = Math.min(scaleRotatedX, scaleRotatedY);
                    const rotatedArea = (labelHeight * scaleRotatedMin) * (labelWidth * scaleRotatedMin);

                    // Compare which orientation makes better use of the cell area
                    if (rotatedArea > directArea) {
                        // Rotate the label 90 degrees - it will use more space this way
                        const scale = scaleRotatedMin;

                        // Calculate scaled dimensions after rotation
                        const scaledWidth = labelHeight * scale;  // Swapped due to rotation
                        const scaledHeight = labelWidth * scale;  // Swapped due to rotation

                        // Center the rotated label in its cell
                        const centerX = xPosition + (cellWidth - scaledWidth) / 2 + scaledWidth; // Adjust for rotation pivot
                        const centerY = yPosition + (cellHeight - scaledHeight) / 2;

                        // Draw the rotated embedded page
                        a4Page.drawPage(embeddedPage, {
                            x: centerX,
                            y: centerY,
                            width: labelWidth * scale,
                            height: labelHeight * scale,
                            rotate: PDFLib.degrees(90)
                        });
                    } else {
                        // No rotation - direct orientation works better
                        const scale = scaleDirectMin;

                        // Calculate scaled dimensions
                        const scaledWidth = labelWidth * scale;
                        const scaledHeight = labelHeight * scale;

                        // Center the label in its cell
                        const centerX = xPosition + (cellWidth - scaledWidth) / 2;
                        const centerY = yPosition + (cellHeight - scaledHeight) / 2;

                        // Draw the embedded page
                        a4Page.drawPage(embeddedPage, {
                            x: centerX,
                            y: centerY,
                            width: scaledWidth,
                            height: scaledHeight
                        });
                    }
                }

                progressBar.value = 60 + ((pageCount / Math.ceil(pageDataList.length / 4)) * 20);
                await new Promise(r => setTimeout(r, 10));
            }

            // Rotate each page by 90 degrees (only for A4 layout mode)
            const pagesToRotate = outputPdf.getPages();
            pagesToRotate.forEach(page => {
                page.setRotation(PDFLib.degrees(90));
            });
        }

        // Save and download the PDF
        progressBar.value = 100;
        const outputBytes = await outputPdf.save();
        downloadPDF(outputBytes, "lebely-cropped.pdf");
        message.textContent = "Processing complete. PDF downloaded.";
    } catch (error) {
        console.error("PDF processing error:", error);
        message.textContent = "Error: " + error.message;
        progressBar.value = 0;
    }
});

function downloadPDF(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

function resetUI() {
    message.textContent = "";
    pagesContainer.innerHTML = "";
    pageDataList = [];
    partnersFound.clear();
    partnerFilter.innerHTML = '<option value="all">All</option>';
    partnerFilter.disabled = true;
    partnerFilter.style.display = "none";
    downloadButton.disabled = true;
    progressBar.value = 0;
}
