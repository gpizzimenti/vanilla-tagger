"use strict";

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerNavigation extends VanillaTagger {
    static get observedAttributes() {
      return ["src", "placeholder", "data-tags", "data-trigger"];
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

    get trigger() {
      return this.dataset.trigger;
    }
    /*---------------------------------------------------------------------------------------*/

    set trigger(value) {
      this.dataset.trigger = value;
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
    if (!host.placeholder) return false;
    let containers = document.querySelectorAll(host.placeholder),
      navigation = document.createElement("ol");

    navigation.classList.add("vanilla-tagger-navigation");

    host.context.navigation = navigation;

    host.context.tags.forEach(function (tag) {
      _addNav(host, tag, navigation);
    });

    host.addEventListener("click", function (event) {
      _removeHighlight(host);
    });

    host.addEventListener("VanillaTagger:tagClick", function (event) {
      let tag = event.detail;
      _toggleTag(host, tag);
    });

    containers.forEach(function (container) {
      container.innerHTML = "";
      container.appendChild(navigation);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addNav = function _addNav(host, tag, navigation) {
    let nav = document.createElement("li");

    nav.dataset.index = tag.index;
    nav.dataset.indexAlphabetical = tag.indexAlphabetical;
    nav.innerHTML = tag.caption;

    nav.addEventListener("click", function (event) {
      _toggleTag(host, tag);
    });

    //nav.addEventListener(host.dataset.trigger, function (event) { //alternative to tagClick tio highlight
    navigation.appendChild(nav);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _toggleTag = function _toggleTag(host, tag) {
    let nav = host.context.navigation.querySelector(
      "[data-index='" + tag.index + "']"
    );

    if (nav.classList.contains("active")) {
      _removeHighlight(host);
      return false;
    }

    let options = {
        state: false,
        exclusive: true,
        highlightedClasses: "toggled show-popup pulsating",
      },
      activeNav = host.context.navigation.querySelector(".active");

    if (activeNav) activeNav.classList.remove("active");

    nav.classList.add("active");

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

    let activeNav = host.context.navigation.querySelector(".active");
    if (activeNav) activeNav.classList.remove("active");

    host.highlightTag(options);
  };

  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerNavigation = VanillaTaggerNavigation;

  customElements.define("vanilla-tagger-navigation", VanillaTaggerNavigation);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
