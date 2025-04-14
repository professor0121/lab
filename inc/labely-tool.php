<div class="main-container">
<div class="co-container">
        <div class="sidebar">
            <h1>Meesho Shipping Label Crop Tool</h1>
            <p>Upload your PDF and your labels will be cropped according to delivery partners. No need for manual
                cropping.</p>
            <div class="file-input-wrapper">
                <label for="fileInput">Select PDF:</label>
                <input type="file" id="fileInput" accept="application/pdf">
            </div>
            <div class="flex">
                <label>Layout Mode:</label>
                <div class="layout-mode-radio">
                    <label class="label-style">
                        <input type="radio" name="layoutMode" value="label" checked> Label Printer
                    </label>
                    <label class="label-style">
                        <input type="radio" name="layoutMode" value="a4"> A4 Layout
                    </label>
                </div>
            </div>
            <div class="flex">
                <label>Sort By:</label>
                <div class="sort-radio">
                    <label class="label-style">
                        <input type="radio" name="sortBy" value="sku" checked> SKU
                    </label>
                    <label class="label-style">
                        <input type="radio" name="sortBy" value="partner"> Delivery Partner
                    </label>
                </div>
            </div>
            <label>Processing Progress:</label>
            <progress id="progressBar" value="0" max="100"></progress>
            <div id="message"></div>
            <button id="downloadButton" disabled>Download Cropped PDF</button>
            <label for="partnerFilter" style="display:none">Filter by Partner:</label>
            <select id="partnerFilter" disabled style="display:none; visibility: hidden;">
                <option value="all">All</option>
            </select>
        </div>
        <div class="main-content">
            <h2>PDF Pages Preview</h2>
            <p>Pages are displayed and grouped by partner. You can filter the pages by partner using the dropdown on the
                left. The cropping is automatically determined by anchor lines on each page.</p>
            <div id="pagesContainer"></div>
        </div>
    </div>
</div>