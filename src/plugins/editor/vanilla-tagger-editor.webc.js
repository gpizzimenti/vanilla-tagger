"use strict";

(function () {
  /*-----------------------------------------------------------------------------------------*/

  const toolbarTemplate = `
    <form class="vanilla-tagger-toolbar">
     <input type="radio" name="tagType" id="tagTypeDot" value="dot" checked>
     <label for="tagTypeDot">Dot</label>     
     <input type="radio" name="tagType" id="tagTypeHotspot" value="hotspot" disabled>
     <label for="tagTypeHotspot">Hotspot</label>
    </form>
  `;

  /*-----------------------------------------------------------------------------------------*/

  const dialogTemplate = `
    <dialog class="vanilla-tagger-dialog">
        <header></header>
        <main></main>
        <footer>
            <button class="btn-confirm">OK</button>
            <button class="btn-cancel">Cancel</button>
        </footer>
    </dialog>
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
      dialogTmpl = document.createElement("template"),
      toolbar,
      dialog;

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
    dialogTmpl.innerHTML = dialogTemplate;
    dialog = dialogTmpl.content.cloneNode(true);

    container.innerHTML = "";
    container.appendChild(toolbar);
    container.appendChild(dialog);

    host.context.toolbar = container.querySelector(".vanilla-tagger-toolbar");
    host.context.dialog = container.querySelector(".vanilla-tagger-dialog");

    if (window.dialogPolyfill)
      window.dialogPolyfill.registerDialog(host.context.dialog);

    _attachEditorEvents(host);

    _attachHostEvents(
      "mousedown mouseup mousemove touchstart touchend touchmove click",
      host
    );
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

  const _attachEditorEvents = function _attachEditorEvents(host) {
    host.context.toolbar
      .querySelectorAll("[name='tagType']")
      .forEach(function (chk) {
        chk.addEventListener("change", function (event) {
          host.dataset.type = this.getAttribute("value");
        });
      });

    host.context.dialog
      .querySelector(".btn-confirm")
      .addEventListener("click", function (event) {
        host.context.dialog.close();
      });

    host.context.dialog
      .querySelector(".btn-cancel")
      .addEventListener("click", function (event) {
        host.context.dialog.close();
      });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachHostEvents = function _attachHostEvents(eventNames, host) {
    eventNames.split(" ").forEach(function (eventName) {
      host.addEventListener(
        eventName,
        function (e) {
          _handleEvent(host, event);
        },
        false
      );
    });

    host.addEventListener("VanillaTagger:tagClick", function (e) {
      _openEditDialog(host, e.detail);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _handleEvent = function _handleEvent(host, event) {
    let type = host.dataset.type;

    if (
      type === "dot" &&
      (event.type === "click" || event.type === "touchend")
    ) {
      event.stopPropagation();
      _addDot(host, event.offsetX, event.offsetY);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addDot = function _addDot(host, x, y) {
    let tags = [...host.tags],
      dot = {},
      coords = _percentValues(host, x, y);

    dot.classes =
      "tag dot light with-border with-shadow pulsating-onhover show-index";
    dot.top = coords.y;
    dot.left = coords.x;

    tags.push(dot);

    host.tags = tags;
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
    const dialog = host.context.dialog;

    _renderEditDialog(host, tag);

    dialog.showModal();
  };

  /*-----------------------------------------------------------------------------------------*/

  const _renderEditDialog = function _renderEditDialog(host, tag) {
    const dialog = host.context.dialog;

    dialog.querySelector("header").innerHTML = "Tag #" + tag.index;
  };

  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerEditor = VanillaTaggerEditor;

  customElements.define("vanilla-tagger-editor", VanillaTaggerEditor);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();