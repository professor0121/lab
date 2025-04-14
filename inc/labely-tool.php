<div class="main-container">
<div class="co-container">
  <div class="sidebar">
    <h1>Meesho Shipping Label Crop Tool</h1>
    <p>Upload your PDF and your labels will be cropped according to delivery partners. No need of manual cropping.</p>
    
    <label for="fileInput">Select PDF:</label>
    <input type="file" id="fileInput" accept="application/pdf">
    
    <label>
      <input type="checkbox" id="sortBySku" />
      Sort by SKU
    </label>
    
    <div id="message"></div>

    <button id="downloadButton" disabled>Download Cropped PDF</button>
    
    <label for="partnerFilter" style="display: none;">Filter by Partner:</label>
    <select id="partnerFilter" disabled style="display: none;">
      <option value="all">All</option>
    </select>
  </div>

  <div class="main-content">
    <h2>PDF Pages Preview</h2>
    <p>Pages are displayed and grouped by partner. You can filter the pages by partner using the dropdown on the left. The cropping is automatically determined by anchor lines on each page.</p>
    <div id="pagesContainer"></div>
  </div>
</div>
</div>