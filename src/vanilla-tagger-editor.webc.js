"use strict";

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerEditor extends VanillaTagger {
    static get observedAttributes() {
      return ["placeholder"];
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    constructor() {
      super();
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
      if (oldValue === newValue) return false;

      _renderEditor(this);
    }

    /*----------------------------------------------------------------------------------------*/
  }

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS ------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  const _renderEditor = function _renderEditor(host) {
    if (!host.placeholder) return false;
    let containers = document.querySelectorAll(host.placeholder),
      editor = document.createElement("ol");

    editor.classList.add("vanilla-tagger-editor");

    containers.forEach(function (container) {
      container.innerHTML = "";
      container.appendChild(editor);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerEditor = VanillaTaggerEditor;

  customElements.define("vanilla-tagger-editor", VanillaTaggerEditor);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
