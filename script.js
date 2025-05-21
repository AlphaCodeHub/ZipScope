// script.js
document.addEventListener("DOMContentLoaded", () => {
    const zipFileInput = document.getElementById("zipFile");
    const dropZone = document.getElementById("dropZone");
    const fileTree = document.getElementById("fileTree");
    const previewPanel = document.getElementById("previewPanel");
    const previewTitle = document.getElementById("previewTitle");
    const previewContent = document.getElementById("previewContent");
    const downloadBtn = document.getElementById("downloadBtn");
    const closePreviewBtn = document.getElementById("closePreview");
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearch");
    const breadcrumb = document.getElementById("breadcrumb");
    const expandAllBtn = document.getElementById("expandAll");
    const collapseAllBtn = document.getElementById("collapseAll");
    const themeToggleBtn = document.getElementById("themeToggle");
    const helpBtn = document.getElementById("helpBtn");
    const helpModal = document.getElementById("helpModal");
    const closeHelpBtn = document.getElementById("closeHelp");
    const jsonViewBtn = document.getElementById("jsonViewBtn");
    const urlInput = document.getElementById('urlInput');
    const shareBtn = document.getElementById('shareBtn');
    const uploadToggle = document.getElementById('uploadToggle');
    const urlToggle = document.getElementById('urlToggle');
    const fileUploadSection = document.getElementById('fileUploadSection');
    const urlInputSection = document.getElementById('urlInputSection');
    const previewStructureBtn = document.getElementById('previewStructure');
  
    // Debug log for preview button
    console.log('Preview button element:', previewStructureBtn);
  
    // Function to generate structure preview
    function generateStructurePreview(structure, level = 0, prefix = '') {
        let output = '';
        const indent = '  '.repeat(level);
        
        // Add folders
        if (structure.folders) {
            for (const folderName of Object.keys(structure.folders).sort()) {
                output += `${indent}📁 ${folderName}/\n`;
                output += generateStructurePreview(structure.folders[folderName], level + 1, prefix + folderName + '/');
            }
        }
        
        // Add files
        if (structure.files) {
            for (const fileName of Object.keys(structure.files).sort()) {
                const { icon } = getFileTypeIcon(fileName);
                const iconMap = {
                    'fa-image': '🖼️',
                    'fa-code': '📄',
                    'fa-file-lines': '📝',
                    'fa-file': '📄'
                };
                const emoji = iconMap[icon] || '📄';
                output += `${indent}${emoji} ${fileName}\n`;
            }
        }
        
        return output;
    }

    // Function to preview file structure
    function previewFileStructure() {
        console.log('Preview button clicked');
        console.log('Current fileStructure:', fileStructure);
        
        if (!fileStructure || Object.keys(fileStructure).length === 0) {
            console.log('No file structure available');
            previewPanel.classList.remove("hidden");
            previewTitle.textContent = "File Structure Preview";
            previewContent.innerHTML = '<p class="text-muted">No file structure to preview.</p>';
            return;
        }

        console.log('Generating structure preview');
        const structureText = generateStructurePreview(fileStructure);
        console.log('Generated structure text:', structureText);
        
        previewPanel.classList.remove("hidden");
        previewTitle.textContent = "File Structure Preview";
        previewContent.innerHTML = `<pre class="structure-preview">${escapeHTML(structureText)}</pre>`;
        console.log('Preview updated');
    }

    // Add event listener for preview structure button
    if (previewStructureBtn) {
        console.log('Adding click listener to preview button');
        previewStructureBtn.addEventListener('click', () => {
            console.log('Preview button clicked');
            previewFileStructure();
        });
    } else {
        console.error('Preview button not found in DOM');
    }
  
    let zip; // JSZip instance
    let fileStructure = {}; // Nested folder structure
    let currentPath = []; // Array of folder names, root is []
    let lastPreviewedFile = null; // Store last previewed file
  
    let jsonViewMode = false; // Whether JSON raw view is enabled
  
    // List of CORS proxies to try
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
  
    // Helper: Clear preview
    function clearPreview() {
      previewTitle.textContent = "File Preview";
      previewContent.innerHTML = "";
      previewPanel.classList.add("hidden");
      downloadBtn.onclick = null;
    }
  
    // Helper: Escape HTML to prevent XSS
    function escapeHTML(str) {
      return str.replace(/[&<>"']/g, tag => ({
        '&': "&amp;",
        '<': "&lt;",
        '>': "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[tag]));
    }
  
    // Helper: Detect if file is previewable text type
    function isTextFile(name) {
      return /\.(txt|md|json|js|css|html|xml|csv|log|ini|yaml|yml|ts|tsx|jsx|scss|less)$/i.test(name);
    }
  
    // Helper: Detect if file is image
    function isImageFile(name) {
      return /\.(png|jpe?g|gif|svg|webp)$/i.test(name);
    }
  
    // Helper: Get file type icon
    function getFileTypeIcon(fileName) {
      if (isImageFile(fileName)) {
        return { icon: "fa-image", type: "image" };
      } else if (isTextFile(fileName)) {
        if (/\.(js|ts|jsx|tsx|html|css|scss|less|json|xml|yaml|yml)$/i.test(fileName)) {
          return { icon: "fa-code", type: "code" };
        }
        return { icon: "fa-file-lines", type: "text" };
      }
      return { icon: "fa-file", type: "document" };
    }
  
    // Build nested file structure object from JSZip files
    function buildFileStructure(zip) {
        console.log('Building file structure from ZIP');
      const root = {};
  
      zip.forEach((relativePath, file) => {
            console.log('Processing file:', relativePath);
        const parts = relativePath.split("/");
        let current = root;
  
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue; // skip empty parts (from trailing /)
  
          if (i === parts.length - 1 && !file.dir) {
            // file
            if (!current.files) current.files = {};
            current.files[part] = file;
                    console.log('Added file:', part);
          } else {
            // folder
            if (!current.folders) current.folders = {};
            if (!current.folders[part]) current.folders[part] = {};
            current = current.folders[part];
                    console.log('Added folder:', part);
          }
        }
      });
  
        console.log('Final file structure:', root);
      return root;
    }
  
    // Render breadcrumb navigation
    function renderBreadcrumb() {
      breadcrumb.innerHTML = "";
  
      // Home / root link
      const rootCrumb = document.createElement("span");
      rootCrumb.className = "breadcrumb-item";
      rootCrumb.innerHTML = '<i class="fas fa-home"></i> Home';
      rootCrumb.title = "Go to root";
      rootCrumb.onclick = () => {
        currentPath = [];
        renderFileTree();
        renderBreadcrumb();
        clearPreview();
        searchInput.value = "";
      };
      breadcrumb.appendChild(rootCrumb);
  
      // Add current path segments
      currentPath.forEach((folder, i) => {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.textContent = "/";
        breadcrumb.appendChild(separator);
  
        const crumb = document.createElement("span");
        crumb.className = "breadcrumb-item";
        crumb.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
        crumb.title = `Go to ${folder}`;
        crumb.onclick = () => {
          currentPath = currentPath.slice(0, i + 1);
          renderFileTree();
          renderBreadcrumb();
          clearPreview();
          searchInput.value = "";
        };
        breadcrumb.appendChild(crumb);
      });
    }
  
    // Recursively render folders and files into a ul list
    function renderList(baseStructure, container, searchTerm = "") {
      container.innerHTML = "";
  
      const ul = document.createElement("ul");
        ul.className = "file-list";
  
      // Folders first
      if (baseStructure.folders) {
        for (const folderName of Object.keys(baseStructure.folders).sort()) {
          if (searchTerm && !folderContainsSearch(baseStructure.folders[folderName], folderName, searchTerm)) {
            continue;
          }
  
          const li = document.createElement("li");
                li.className = "folder";
  
          const folderToggle = document.createElement("span");
                folderToggle.className = "folder-toggle";
                folderToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
          folderToggle.setAttribute("aria-label", "Toggle folder");
                folderToggle.title = "Expand/Collapse folder";

                const folderIcon = document.createElement("i");
                folderIcon.className = "fas fa-folder";
                folderIcon.style.color = "var(--primary-color)";
  
          const folderNameSpan = document.createElement("span");
                folderNameSpan.className = "folder-name";
          folderNameSpan.textContent = folderName;
                folderNameSpan.title = `Open ${folderName}`;
  
          li.appendChild(folderToggle);
                li.appendChild(folderIcon);
          li.appendChild(folderNameSpan);
  
          const nestedUl = document.createElement("ul");
                nestedUl.className = "file-list nested";
          nestedUl.style.display = "none";
  
          renderList(baseStructure.folders[folderName], nestedUl, searchTerm);
  
          li.appendChild(nestedUl);
  
                folderToggle.onclick = (e) => {
                    e.stopPropagation();
                    const isExpanded = li.classList.contains("expanded");
                    if (isExpanded) {
              li.classList.remove("expanded");
              nestedUl.style.display = "none";
            } else {
              li.classList.add("expanded");
              nestedUl.style.display = "block";
                    }
                };

                folderNameSpan.onclick = (e) => {
                    e.stopPropagation();
                    currentPath.push(folderName);
                    renderFileTree();
                    renderBreadcrumb();
                    clearPreview();
                    searchInput.value = "";
          };
  
          ul.appendChild(li);
        }
      }
  
      // Then files
      if (baseStructure.files) {
        for (const fileName of Object.keys(baseStructure.files).sort()) {
          if (searchTerm && !fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue;
          }
  
          const li = document.createElement("li");
                li.className = "file";

                const { icon, type } = getFileTypeIcon(fileName);
                const fileIcon = document.createElement("i");
                fileIcon.className = "fas " + icon;
                li.setAttribute("data-type", type);

                const fileNameSpan = document.createElement("span");
                fileNameSpan.textContent = fileName;
                fileNameSpan.title = `View ${fileName}`;

                li.appendChild(fileIcon);
                li.appendChild(fileNameSpan);

                // Update click handler to both highlight and preview
                li.onclick = (e) => {
                    e.stopPropagation();
                    // Remove highlight from all files
                    document.querySelectorAll('.file').forEach(f => f.classList.remove('selected'));
                    // Add highlight to clicked file
                    li.classList.add('selected');
                    // Preview the file
                    const file = baseStructure.files[fileName];
                    if (file) {
                        previewFile(file);
                    }
          };
  
          ul.appendChild(li);
        }
      }
  
      container.appendChild(ul);
    }
  
    // Check if folder or any of its subfolders/files match search term
    function folderContainsSearch(folderObj, folderName, searchTerm) {
      searchTerm = searchTerm.toLowerCase();
  
      if (folderName.toLowerCase().includes(searchTerm)) return true;
  
      if (folderObj.files) {
        for (const fileName in folderObj.files) {
          if (fileName.toLowerCase().includes(searchTerm)) return true;
        }
      }
  
      if (folderObj.folders) {
        for (const subFolderName in folderObj.folders) {
          if (folderContainsSearch(folderObj.folders[subFolderName], subFolderName, searchTerm)) {
            return true;
          }
        }
      }
  
      return false;
    }
  
    // Render the file tree based on currentPath and fileStructure
    function renderFileTree(searchTerm = "") {
      let currentNode = fileStructure;
      for (const folderName of currentPath) {
        if (!currentNode.folders || !currentNode.folders[folderName]) {
          // Invalid path, reset to root
          currentPath = [];
          currentNode = fileStructure;
          break;
        }
        currentNode = currentNode.folders[folderName];
      }
  
      renderList(currentNode, fileTree, searchTerm);
    }
  
    // Preview a file
    async function previewFile(file) {
        console.log('Starting file preview for:', file.name);
        try {
            lastPreviewedFile = file;
            clearPreview();
            previewPanel.classList.remove("hidden");
            previewTitle.textContent = file.name;

            // Setup download button
            downloadBtn.onclick = () => {
                file.async("blob").then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = file.name.split("/").pop();
                    a.click();
                    URL.revokeObjectURL(url);
                });
            };

            // Get file content
            const content = await file.async("text");
            console.log('File content loaded, length:', content.length);

            if (isTextFile(file.name)) {
                console.log('Processing text file');
                if (jsonViewMode && /\.(json)$/i.test(file.name)) {
                    try {
                        const jsonObj = JSON.parse(content);
                        previewContent.innerHTML = `<pre class="code-preview">${escapeHTML(JSON.stringify(jsonObj, null, 2))}</pre>`;
                    } catch (e) {
                        previewContent.innerHTML = `<pre class="code-preview">${escapeHTML(content)}</pre>`;
                    }
                } else {
                    previewContent.innerHTML = `<pre class="code-preview">${escapeHTML(content)}</pre>`;
                }
            } else if (isImageFile(file.name)) {
                console.log('Processing image file');
                const blob = await file.async("blob");
                const url = URL.createObjectURL(blob);
                previewContent.innerHTML = `<img src="${url}" alt="${file.name}" style="max-width: 100%;">`;
            } else {
                console.log('Unsupported file type');
                previewContent.innerHTML = `<p>Preview not supported for this file type.</p>`;
            }
        } catch (error) {
            console.error('Error in previewFile:', error);
            previewContent.innerHTML = `<p>Error loading file: ${error.message}</p>`;
        }
    }
  
    // Update handleUrl function to handle both ZIP and previews
    async function handleUrl(url) {
        try {
            clearPreview();
            fileTree.innerHTML = "";
            fileTree.classList.add("loading");

            // Validate URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                throw new Error('Please enter a valid URL starting with http:// or https://');
            }

            // Try to detect content type
            let contentType;
            try {
                const headResponse = await fetchWithProxy(url, { method: 'HEAD' });
                contentType = headResponse.headers.get('content-type');
            } catch (error) {
                // If HEAD request fails, try GET request
                const getResponse = await fetchWithProxy(url);
                contentType = getResponse.headers.get('content-type');
            }

            if (contentType && contentType.includes('text/html')) {
                // Handle webpage
                const webpage = await fetchAndParseWebpage(url);
                const linkTree = buildLinkTree(webpage.links, url);
                renderLinkTree(linkTree, fileTree);
                fileTree.classList.remove("loading");
                return;
            }

            // Handle regular files
            const response = await fetchWithProxy(url);
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const fileName = url.split('/').pop();
            
            if (blob.type === 'application/zip' || url.toLowerCase().endsWith('.zip')) {
                // Handle ZIP file
                const zip = await JSZip.loadAsync(blob);
                fileStructure = buildFileStructure(zip);
                currentPath = [];
                fileTree.classList.remove("loading");
                renderFileTree();
                renderBreadcrumb();

                // Preview the first file in the ZIP if available
                const firstFile = Object.values(zip.files).find(file => !file.dir);
                if (firstFile) {
                    previewFile(firstFile);
                }
            } else {
                // Handle single file
                const file = new File([blob], fileName, { type: blob.type });
                
                // Create a simple file structure for single files
                fileStructure = {
                    files: {
                        [fileName]: file
                    }
                };
                
                // Update UI
                fileTree.classList.remove("loading");
                renderFileTree();
                renderBreadcrumb();
                previewFile(file);
            }
        } catch (error) {
            fileTree.classList.remove("loading");
            let errorMessage = error.message;
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'Unable to access the URL. This might be due to CORS restrictions or the URL being inaccessible.';
            }
            
            fileTree.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load from URL: ${errorMessage}
                    <br><br>
                    <small>Note: The URL must be publicly accessible. Try using a different URL or check if the resource is available.</small>
                </div>`;
        }
    }

    // Update handleZipFile function to also preview first file
    function handleZipFile(file) {
        console.log('Handling ZIP file:', file.name);
      clearPreview();
        fileTree.innerHTML = "";
        fileTree.classList.add("loading");
        
      JSZip.loadAsync(file).then(loadedZip => {
            console.log('ZIP file loaded successfully');
        zip = loadedZip;
        fileStructure = buildFileStructure(zip);
            console.log('File structure built:', fileStructure);
        currentPath = [];
            fileTree.classList.remove("loading");
        renderFileTree();
        renderBreadcrumb();
        searchInput.value = "";

            // Preview the first file in the ZIP if available
            const firstFile = Object.values(loadedZip.files).find(file => !file.dir);
            if (firstFile) {
                previewFile(firstFile);
            }
      }).catch(err => {
            console.error('Error loading ZIP file:', err);
            fileTree.classList.remove("loading");
        fileTree.innerHTML = `<p class="error">Failed to load ZIP file: ${err.message}</p>`;
      });
    }
  
    // Search input handler
    function handleSearchInput() {
      const term = searchInput.value.trim();
      renderFileTree(term);
      clearPreview();
    }
  
    // Clear search input
    function clearSearch() {
      searchInput.value = "";
      renderFileTree();
      clearPreview();
    }
  
    // Expand all folders recursively
    function expandAllFolders() {
      document.querySelectorAll(".folder").forEach(folder => {
        const toggle = folder.querySelector(".folder-toggle");
        const nestedUl = folder.querySelector("ul.nested");
        if (!folder.classList.contains("expanded")) {
          folder.classList.add("expanded");
          if (nestedUl) nestedUl.style.display = "block";
          if (toggle) toggle.querySelector("i").style.transform = "rotate(90deg)";
        }
        // Recursively expand nested folders
        if (nestedUl) {
          expandAllFolders(nestedUl);
        }
      });
    }
  
    // Collapse all folders recursively
    function collapseAllFolders() {
      document.querySelectorAll(".folder.expanded").forEach(folder => {
        const toggle = folder.querySelector(".folder-toggle");
        const nestedUl = folder.querySelector("ul.nested");
        if (folder.classList.contains("expanded")) {
          folder.classList.remove("expanded");
          if (nestedUl) nestedUl.style.display = "none";
          if (toggle) toggle.querySelector("i").style.transform = "rotate(0deg)";
        }
        // Recursively collapse nested folders
        if (nestedUl) {
          collapseAllFolders(nestedUl);
        }
      });
    }
  
    // Theme toggle (dark/light)
    function toggleTheme() {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-bs-theme') === 'dark';
      const theme = isDark ? 'light' : 'dark';
      html.setAttribute('data-bs-theme', theme);
      localStorage.setItem('theme', theme);
      
      // Update theme toggle icon
      const themeIcon = document.querySelector('#themeToggle i');
      themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  
    // Initialize theme from localStorage
    function initializeTheme() {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-bs-theme', theme);
      
      // Set initial theme icon
      const themeIcon = document.querySelector('#themeToggle i');
      themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
  
    // Drag and drop handlers
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
  
    function highlightDropZone() {
      dropZone.classList.add('drag-over');
    }
  
    function unhighlightDropZone() {
      dropZone.classList.remove('drag-over');
    }
  
    function handleDrop(e) {
      const dt = e.dataTransfer;
      if (dt.files && dt.files.length > 0) {
        handleZipFile(dt.files[0]);
      }
      unhighlightDropZone();
    }
  
    // Help modal
    function openHelp() {
      const helpModal = document.getElementById('helpModal');
      const modal = new bootstrap.Modal(helpModal);
      modal.show();
    }
  
    function closeHelp() {
      const helpModal = document.getElementById('helpModal');
      const modal = bootstrap.Modal.getInstance(helpModal);
      if (modal) {
        modal.hide();
      }
    }
  
    // JSON View toggle
    function toggleJsonView() {
      jsonViewMode = !jsonViewMode;
      if (jsonViewMode) {
        jsonViewBtn.textContent = "Disable JSON View";
      } else {
        jsonViewBtn.textContent = "Enable JSON View";
      }
      // Re-render preview if file open and JSON
      // This requires storing last previewed file - let's store it:
      if (lastPreviewedFile) {
        previewFile(lastPreviewedFile);
      }
    }
  
    // Try fetching with different CORS proxies
    async function fetchWithProxy(url, options = {}) {
        let lastError = null;
        
        for (const proxy of CORS_PROXIES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Accept': 'text/html,application/xhtml+xml,application/zip,application/octet-stream,*/*'
                    }
                });
                
                if (response.ok) {
                    return response;
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All CORS proxies failed');
    }

    // Fetch and parse webpage
    async function fetchAndParseWebpage(url) {
        try {
            const response = await fetchWithProxy(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            return {
                title: doc.title,
                baseUrl: new URL(url).origin,
                links: extractInternalLinks(doc, url)
            };
        } catch (error) {
            throw new Error(`Failed to fetch webpage: ${error.message}`);
        }
    }

    // Extract internal links from webpage
    function extractInternalLinks(doc, baseUrl) {
        const baseUrlObj = new URL(baseUrl);
        const links = new Set();
        
        // Get all anchor tags
        const anchors = doc.getElementsByTagName('a');
        
        for (const anchor of anchors) {
            const href = anchor.getAttribute('href');
            if (!href) continue;
            
            try {
                // Handle relative URLs
                const absoluteUrl = new URL(href, baseUrl).href;
                const urlObj = new URL(absoluteUrl);
                
                // Only include links from the same domain
                if (urlObj.origin === baseUrlObj.origin) {
                    links.add({
                        url: absoluteUrl,
                        text: anchor.textContent.trim() || absoluteUrl,
                        title: anchor.getAttribute('title') || ''
                    });
                }
            } catch (e) {
                // Skip invalid URLs
                continue;
            }
        }
        
        return Array.from(links);
    }

    // Build tree structure from links
    function buildLinkTree(links, baseUrl) {
        const baseUrlObj = new URL(baseUrl);
        const root = {
            name: baseUrlObj.hostname,
            type: 'folder',
            url: baseUrl,
            children: {}
        };

        links.forEach(link => {
            const pathParts = new URL(link.url).pathname.split('/').filter(part => part);
            let current = root;
            let fullPath = '';

            pathParts.forEach((part, index) => {
                fullPath += '/' + part;
                const isLast = index === pathParts.length - 1;
                
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        type: isLast ? 'file' : 'folder',
                        url: baseUrlObj.origin + fullPath,
                        text: isLast ? link.text : part,
                        title: isLast ? link.title : '',
                        children: isLast ? null : {}
                    };
                }
                
                current = current.children[part];
            });
        });

        return root;
    }

    // Render link tree
    function renderLinkTree(tree, container) {
        container.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'file-list';

        function renderNode(node, parentElement) {
            const li = document.createElement('li');
            li.className = node.type === 'folder' ? 'folder' : 'file';

            if (node.type === 'folder') {
                const folderToggle = document.createElement('span');
                folderToggle.className = 'folder-toggle';
                folderToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
                
                const folderIcon = document.createElement('i');
                folderIcon.className = 'fas fa-folder';
                folderIcon.style.color = 'var(--primary-color)';

                const folderName = document.createElement('span');
                folderName.className = 'folder-name';
                folderName.textContent = node.name;
                folderName.title = node.title || node.name;

                li.appendChild(folderToggle);
                li.appendChild(folderIcon);
                li.appendChild(folderName);

                folderName.onclick = () => {
                    const isExpanded = li.classList.contains('expanded');
                    if (isExpanded) {
                        li.classList.remove('expanded');
                        const nestedUl = li.querySelector('ul.nested');
                        if (nestedUl) nestedUl.style.display = 'none';
                    } else {
                        li.classList.add('expanded');
                        const nestedUl = li.querySelector('ul.nested');
                        if (nestedUl) nestedUl.style.display = 'block';
                    }
                };

                if (Object.keys(node.children).length > 0) {
                    const nestedUl = document.createElement('ul');
                    nestedUl.className = 'file-list nested';
                    nestedUl.style.display = 'none';
                    
                    Object.values(node.children).forEach(child => {
                        renderNode(child, nestedUl);
                    });
                    
                    li.appendChild(nestedUl);
                }
            } else {
                const fileIcon = document.createElement('i');
                fileIcon.className = 'fas fa-file';
                
                const fileName = document.createElement('span');
                fileName.textContent = node.text || node.name;
                fileName.title = node.title || node.text || node.name;

                li.appendChild(fileIcon);
                li.appendChild(fileName);

                li.onclick = () => {
                    handleUrl(node.url);
                };
            }

            parentElement.appendChild(li);
        }

        Object.values(tree.children).forEach(child => {
            renderNode(child, ul);
        });

        container.appendChild(ul);
    }
  
    // Event listeners
    zipFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleZipFile(e.target.files[0]);
      }
    });
  
    dropZone.addEventListener("dragenter", preventDefaults);
    dropZone.addEventListener("dragover", preventDefaults);
    dropZone.addEventListener("dragleave", preventDefaults);
    dropZone.addEventListener("drop", preventDefaults);
  
    dropZone.addEventListener("dragenter", highlightDropZone);
    dropZone.addEventListener("dragover", highlightDropZone);
    dropZone.addEventListener("dragleave", unhighlightDropZone);
    dropZone.addEventListener("drop", unhighlightDropZone);
  
    dropZone.addEventListener("drop", handleDrop);
  
    closePreviewBtn.addEventListener("click", clearPreview);
    searchInput.addEventListener("input", handleSearchInput);
    clearSearchBtn.addEventListener("click", clearSearch);
    expandAllBtn.addEventListener("click", () => expandAllFolders());
    collapseAllBtn.addEventListener("click", () => collapseAllFolders());
    themeToggleBtn.addEventListener("click", toggleTheme);
    helpBtn.addEventListener("click", openHelp);
    closeHelpBtn.addEventListener("click", closeHelp);
    jsonViewBtn.addEventListener("click", toggleJsonView);
  
    // Event listeners for modal
    helpModal.addEventListener('hidden.bs.modal', () => {
      document.body.style.overflow = '';
    });
  
    // Close modal when clicking outside
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        closeHelp();
      }
    });
  
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpModal.classList.contains('show')) {
        closeHelp();
      }
    });
  
    // Event listeners for URL input
    if (urlInput) {
        // Handle Enter key
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUrlInput();
            }
        });

        // Handle Load button click
        const loadUrlBtn = document.getElementById('loadUrl');
        if (loadUrlBtn) {
            loadUrlBtn.addEventListener('click', handleUrlInput);
        }
    }

    // Add share button handler
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            if (lastPreviewedFile) {
                const shareLink = generateShareLink(lastPreviewedFile);
                if (shareLink) {
                    // Copy to clipboard
                    navigator.clipboard.writeText(shareLink).then(() => {
                        alert('Share link copied to clipboard!');
                    });
                }
            }
        });
    }

    // Handle shared links on page load
    handleSharedLink();
  
    // Initial setup: clear preview and file tree
    clearPreview();
    fileTree.innerHTML = "<p>No ZIP file loaded.</p>";
    initializeTheme();
    renderFileTree();
    renderBreadcrumb();

    // Add toggle functionality for upload/URL sections
    if (uploadToggle && urlToggle) {
        uploadToggle.addEventListener('click', () => {
            uploadToggle.classList.add('active');
            urlToggle.classList.remove('active');
            fileUploadSection.classList.remove('d-none');
            urlInputSection.classList.add('d-none');
        });

        urlToggle.addEventListener('click', () => {
            urlToggle.classList.add('active');
            uploadToggle.classList.remove('active');
            urlInputSection.classList.remove('d-none');
            fileUploadSection.classList.add('d-none');
        });
    }

    // Add URL input handling
    function handleUrlInput() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (url) {
            try {
                // Validate URL format
                new URL(url);
                handleUrl(url);
            } catch (error) {
                fileTree.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Invalid URL format. Please enter a valid URL starting with http:// or https://
                    </div>`;
            }
        } else {
            fileTree.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Please enter a URL
                </div>`;
        }
    }

    // Add share functionality
    function generateShareLink(file) {
        if (!file) return null;
        
        const filePath = file.name;
        const shareData = {
            path: filePath,
            timestamp: Date.now()
        };
        
        // In a real application, you would store this on a server
        // For demo purposes, we'll use localStorage
        const shareId = btoa(JSON.stringify(shareData));
        localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
        
        return `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    }

    // Handle shared links
    function handleSharedLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            const shareData = JSON.parse(localStorage.getItem(`share_${shareId}`));
            if (shareData) {
                // In a real application, you would fetch the file from a server
                // For demo purposes, we'll just show the path
                fileTree.innerHTML = `<p>Shared file: ${shareData.path}</p>`;
            }
        }
    }
  });
  