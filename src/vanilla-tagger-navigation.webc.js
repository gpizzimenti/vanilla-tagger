"use strict";

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerNavigation extends VanillaTagger {
    static get observedAttributes() {
      return ["placeholder", "data-trigger"];
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
      if (oldValue === newValue) return false;

      _renderNavigation(this);
    }

    /*----------------------------------------------------------------------------------------*/
  }

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS ------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  const _renderNavigation = function _render(host) {
    if (!host.placeholder) return false;
    let containers = document.querySelectorAll(host.placeholder),
      navigation = document.createElement("ol");

    navigation.classList.add("vanilla-tagger-navigation");

    host.context.tags.forEach(function (tag) {
      _addNav(host, tag, navigation);
    });

    host.addEventListener("click", function (event) {
      let options = {
        state: false,
        exclusive: true,
        highlightedClasses: "toggled show-popup pulsating",
      };

      host.highlightTag(options);

      let activeNav = navigation.querySelector(".active");
      if (activeNav) activeNav.classList.remove("active");
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

    nav.addEventListener(
      host.dataset.trigger,
      function (event) {
        event.stopImmediatePropagation();

        let options = {
          state: false,
          exclusive: true,
          highlightedClasses: "toggled show-popup pulsating",
        };

        if (nav.classList.contains("active")) {
          nav.classList.remove("active");
          host.highlightTag(options);
          return false;
        }

        let activeNav = navigation.querySelector(".active");

        if (activeNav) activeNav.classList.remove("active");

        nav.classList.add("active");

        options.tag = tag;
        options.state = true;

        host.highlightTag(options);
      },
      false
    );

    navigation.appendChild(nav);
  };

  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  window.VanillaTaggerNavigation = VanillaTaggerNavigation;

  customElements.define("vanilla-tagger-navigation", VanillaTaggerNavigation);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
