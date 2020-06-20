"use strict";

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerNavigation extends VanillaTagger {
    static get observedAttributes() {
      return ["src", "placeholder", "data-tags"];
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    constructor() {
      super();

      this.addEventListener("VanillaTagger:tagsLoaded", function (e) {
        _renderNavigation(this);
      });
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
      else _renderNavigation(this);
    }

    /*----------------------------------------------------------------------------------------*/
  }

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS ------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  const _renderNavigation = function _renderNavigation(host) {
    let navigation,
      tagsModified = [];

    if (host.placeholder) {
      let containers = document.querySelectorAll(host.placeholder);

      navigation = document.createElement("ol");
      navigation.classList.add("vanilla-tagger-navigation");

      host.context.navigation = navigation;

      containers.forEach(function (container) {
        container.innerHTML = "";
        container.appendChild(navigation);
      });
    }

    host.tags.forEach(function (tag) {
      let popup = tag.popup;

      popup.showOn = "hover;";

      tagsModified.push(tag);

      if (navigation) _addNav(host, tag, navigation);
    });

    host.tags = tagsModified;

    host.addEventListener("click", function (event) {
      _removeHighlight(host);
    });

    host.addEventListener("VanillaTagger:tagClick", function (event) {
      let tag = event.detail;
      _toggleTag(host, tag);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addNav = function _addNav(host, tag, navigation) {
    let nav = document.createElement("li");

    nav.dataset.index = tag.index;
    nav.dataset.indexAlphabetical = tag.indexAlphabetical;
    tag.classes.split(" ").forEach(function (cl, index) {
      nav.classList.add("vanilla-tagger-" + cl);
    });

    nav.innerHTML = tag.caption;

    nav.addEventListener("click", function (event) {
      _toggleTag(host, tag);
    });

    navigation.appendChild(nav);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _toggleTag = function _toggleTag(host, tag) {
    let options = {
      state: false,
      exclusive: true,
      highlightedClasses: "toggled show-popup pulsating",
    };

    if (host.context.navigation) {
      let nav = host.context.navigation.querySelector(
        "[data-index='" + tag.index + "']"
      );

      if (nav.classList.contains("active")) {
        _removeHighlight(host);
        return false;
      }

      let activeNav = host.context.navigation.querySelector(".active");

      if (activeNav) activeNav.classList.remove("active");

      nav.classList.add("active");
    }

    options.tag = tag;
    options.state = true;

    host.highlightTag(options);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _removeHighlight = function _removeHighlight(host) {
    let options = {
      state: false,
      exclusive: true,
      highlightedClasses: "toggled show-popup pulsating",
    };

    if (host.context.navigation) {
      let activeNav = host.context.navigation.querySelector(".active");
      if (activeNav) activeNav.classList.remove("active");
    }

    host.highlightTag(options);
  };

  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerNavigation = VanillaTaggerNavigation;

  customElements.define("vanilla-tagger-navigation", VanillaTaggerNavigation);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
