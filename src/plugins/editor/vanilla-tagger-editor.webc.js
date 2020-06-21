"use strict";

(function (EditorTemplates) {
  /*-----------------------------------------------------------------------------------------*/

  const toolbarTemplate = `
    <form class="vanilla-tagger-toolbar" onsubmit="return false;">

     <input type="radio" class="toggler" name="tagType" id="tagTypeDot" value="dot" checked>
     <label for="tagTypeDot">Dot</label>     
     <input type="radio" class="toggler" name="tagType" id="tagTypeHotspot" value="hotspot" disabled>
     <label for="tagTypeHotspot">Hotspot</label>

     &nbsp;&nbsp;

     <button id="btn-export">Export data</button>

    </form>
  `;

  /*-----------------------------------------------------------------------------------------*/

  const dialogFormTemplate = `
    <dialog class="vanilla-tagger-dialog" id="dialogForm">
        <header></header>
        <main></main>
        <footer>
        </footer>
    </dialog>
    `;

  /*-----------------------------------------------------------------------------------------*/

  const dialogExportTemplate = `
    <dialog class="vanilla-tagger-dialog"  id="dialogExport">
        <header>Export configuration data</header>
        <main><pre></pre></main>
        <footer>
          <button class="btn-close">OK</button>
        </footer>
    </dialog>
    `;

  /*-----------------------------------------------------------------------------------------*/

  const dialogHeaderTemplate = (tag) => `
    Tag #${tag.index} <button data-index="${tag.index}" class="btn-remove">Remove</button>
    `;

  /*-----------------------------------------------------------------------------------------*/

  const dialogFooterTemplate = (tag) => `
    <button class="btn-confirm" type="submit" data-index="${tag.index}">OK</button>
    <button class="btn-cancel">Cancel</button>
  `;

  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerEditor extends VanillaTagger {
    static get observedAttributes() {
      return ["src", "placeholder", "data-tags"];
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    constructor() {
      super();

      _renderEditor(this);
    }

    /*---------------------------------------------------------------------------------------*/

    get placeholder() {
      return this.getAttribute("placeholder");
    }
    /*---------------------------------------------------------------------------------------*/

    set placeholder(value) {
      this.setAttribute("placeholder", value);
    }

    /*---------------------------------------------------------------------------------------*/

    attributeChangedCallback(name, oldValue, newValue) {
      if (
        !this ||
        !this.context.wrapper ||
        this.classList.contains("updating") ||
        oldValue === newValue
      )
        return false;

      if (name === "src") this.loadImage();
      else if (name === "data-tags") this.loadTags();
      else _renderEditor(this);
    }

    /*----------------------------------------------------------------------------------------*/
  }

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS ------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  const _renderEditor = async function _renderEditor(host) {
    if (!host.placeholder) return false;
    let container = document.querySelector(host.placeholder),
      toolbarTmpl = document.createElement("template"),
      dialogFormTmpl = document.createElement("template"),
      dialogExportTmpl = document.createElement("template"),
      toolbar,
      dialogForm,
      dialogExport;

    if (container.length < 1) return false;

    if (typeof HTMLDialogElement != "function") {
      await Promise.all([
        _fetchStyle(
          "https://cdnjs.cloudflare.com/ajax/libs/dialog-polyfill/0.5.1/dialog-polyfill.min.css",
          host
        ),
        _fetchScript(
          "https://cdnjs.cloudflare.com/ajax/libs/dialog-polyfill/0.5.1/dialog-polyfill.min.js",
          host
        ),
      ]);
    }

    host.dataset.type = "dot"; //initial

    toolbarTmpl.innerHTML = toolbarTemplate;
    toolbar = toolbarTmpl.content.cloneNode(true);
    dialogFormTmpl.innerHTML = dialogFormTemplate;
    dialogForm = dialogFormTmpl.content.cloneNode(true);
    dialogExportTmpl.innerHTML = dialogExportTemplate;
    dialogExport = dialogExportTmpl.content.cloneNode(true);

    container.innerHTML = "";
    container.appendChild(toolbar);
    container.appendChild(dialogForm);
    container.appendChild(dialogExport);

    host.context.toolbar = container.querySelector(".vanilla-tagger-toolbar");
    host.context.dialogForm = container.querySelector("#dialogForm");
    host.context.dialogExport = container.querySelector("#dialogExport");

    if (window.dialogPolyfill) {
      window.dialogPolyfill.registerDialog(host.context.dialogForm);
      window.dialogPolyfill.registerDialog(host.context.dialogExport);
    }

    _attachEvents(host);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _fetchScript = async function _fetchScript(url, host) {
    return new Promise((resolve, reject) => {
      let link = document.createElement("script");
      link.type = "text/javascript";
      link.onload = () => {
        resolve(link);
      };
      link.onerror = () => {
        reject(link);
      };

      link.src = url;

      document.head.appendChild(link);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _fetchStyle = async function _fetchStyle(url, host) {
    return new Promise((resolve, reject) => {
      let link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.onload = () => {
        resolve(link);
      };
      link.onerror = () => {
        reject(link);
      };
      link.href = url;

      document.head.appendChild(link);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachEvents = function _attachEvents(host) {
    let eventNames =
      "mousedown mouseup mousemove touchstart touchend touchmove click";

    eventNames.split(" ").forEach(function (eventName) {
      host.addEventListener(
        eventName,
        function (e) {
          _handleEvent(host, event);
        },
        false
      );
    });

    host.context.toolbar
      .querySelectorAll("[name='tagType']")
      .forEach(function (chk) {
        chk.addEventListener("change", function (event) {
          host.dataset.type = this.getAttribute("value");
        });
      });

    host.context.toolbar
      .querySelector("#btn-export")
      .addEventListener("click", function (event) {
        _openExportDialog(host);
      });

    host.addEventListener("VanillaTagger:tagClick", function (e) {
      _openEditDialog(host, e.detail);
    });

    host.context.dialogForm.addEventListener("click", function (event) {
      const btn = event.target;

      if (btn.classList.contains("btn-remove"))
        _removeTag(host, btn.dataset.index);
      else if (btn.classList.contains("btn-confirm"))
        _updateTag(host, btn.dataset.index);
      else if (btn.classList.contains("btn-cancel"))
        host.context.dialogForm.close();
    });

    host.context.dialogExport.addEventListener("click", function (event) {
      const btn = event.target;

      if (btn.classList.contains("btn-close"))
        host.context.dialogExport.close();
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _handleEvent = function _handleEvent(host, event) {
    event.stopPropagation();

    let type = host.dataset.type;

    if (type === "dot" && event.type === "click") {
      let tag = _addDot(host, event.offsetX, event.offsetY);
      _openEditDialog(host, tag);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addDot = function _addDot(host, x, y) {
    let tags = host.tags,
      dot = {},
      coords = _percentValues(host, x, y);

    dot.classes =
      "tag dot blank" +
      (EditorTemplates && EditorTemplates.tagDefaultClasses
        ? " " + EditorTemplates.tagDefaultClasses
        : "");
    dot.top = coords.y;
    dot.left = coords.x;

    tags.push(dot);

    host.tags = tags;

    return host.getTagByIndex(host.tags.length);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _percentValues = function _percentValues(host, x, y) {
    let hostW = host.clientWidth;
    let hostH = host.clientHeight;

    let xperc = (100 * x) / hostW;
    let yperc = (100 * y) / hostH;

    return { x: xperc, y: yperc };
  };

  /*-----------------------------------------------------------------------------------------*/

  const _openEditDialog = function _openEditDialog(host, tag) {
    const dialog = host.context.dialogForm;

    dialog.querySelector("header").innerHTML = dialogHeaderTemplate(tag);
    dialog.querySelector("footer").innerHTML = dialogFooterTemplate(tag);

    if (EditorTemplates && EditorTemplates.tagForm) {
      dialog.querySelector("main").innerHTML = EditorTemplates.tagForm(tag);
    }

    dialog.showModal();
  };

  /*-----------------------------------------------------------------------------------------*/

  const _openExportDialog = function _openExportDialog(host) {
    const dialog = host.context.dialogExport,
      pre = document.createElement("pre"),
      exportData = {};

    exportData.src = host.src;
    exportData.placeholder = host.placeholder;

    if (EditorTemplates && EditorTemplates.processTags) {
      exportData.tags = EditorTemplates.processTags(host);
    } else {
      exportData.tags = host.tags;
    }

    dialog.querySelector("pre").textContent = JSON.stringify(
      exportData,
      undefined,
      2
    );

    dialog.showModal();
  };

  /*-----------------------------------------------------------------------------------------*/

  const _removeTag = function _removeTag(host, index) {
    if (confirm("Are you sure?")) {
      let tags = host.tags;
      tags.splice(index - 1, 1);
      host.tags = tags;

      host.context.dialogForm.close();
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _updateTag = function _updateTag(host, index) {
    let form = host.context.dialogForm.querySelector("form");

    if (!form.checkValidity()) {
      return false;
    }

    if (EditorTemplates && EditorTemplates.buildTag) {
      let tags = host.tags;

      tags[index - 1] = EditorTemplates.buildTag(tags[index - 1], form);

      host.tags = tags;
    }

    host.context.dialogForm.close();
  };

  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerEditor = VanillaTaggerEditor;

  customElements.define("vanilla-tagger-editor", VanillaTaggerEditor);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})(VanillaTaggerEditorTemplates);
