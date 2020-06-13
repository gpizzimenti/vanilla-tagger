"use strict";

//TODO: CSS classes/methods to higlight a specific tag and dim all other tags
//TODO: add public method to update & reposition popup
//TODO: summary / navigation example
//TODO: loading/missing/error states (CSS only)
//TODO: sync state/attributes in method calls (?)
//TODO: add other icons (CSS)
//TODO: breakpoints as data- in :host

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*-------------------------------- PRIVATE PROPERTIES -------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  let host, //WEBCOMPONENT INSTANCE
    wrapper,
    tags = [],
    resizeObserver,
    loggedWidth,
    breakpoints = {
      small: 640, //default.. you can alter this through the "--format-small-trigger" CSS variable in vanilla-tagger.theme.css
    };

  /*-----------------------------------------------------------------------------------------*/

  const baseStyle = `

    :host{
        display: inline-block;
        box-sizing: border-box;
    }

    :host([hidden]) { display: none }
    
    :host([disabled]) {
      opacity: 0.5;
      pointer-events: none;
    }

    .wrapper, .wrapper > img {
        display: block;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    .wrapper {
        object-fit: fill;
        position: relative;
    }    

    .tag {
        position: absolute;
        display: block;
    }    
`;

  /*-----------------------------------------------------------------------------------------*/

  const themeUrl = "styles/vanilla-tagger.theme.css";

  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTagger extends HTMLElement {
    static get observedAttributes() {
      return ["data-img", "data-tags"];
    }

    constructor() {
      super();
      (host = this), host.attachShadow({ mode: "open" });
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    connectedCallback() {
      _createComponent();
    }

    /*----------------------------------------------------------------------------------------*/

    attributeChangedCallback(name, oldValue, newValue) {
      if (
        !host ||
        !wrapper ||
        host.classList.contains("updating") ||
        oldValue === newValue
      )
        return false;

      if (name === "data-img") host.loadImage();
      else if (name === "data-tags") host.loadTags();
    }

    /*----------------------------------------------------------------------------------------*/

    async loadImage(src) {
      if (!src && !host.dataset.img) {
        console.warn(
          "No attribute 'data-img' found nor 'src' parameter passed to method 'loadImage'"
        );
        return false;
      }

      host.classList.add("updating");
      wrapper.classList.add("img-loading");

      const imgObj = await _fetchImage(src || host.dataset.img)
        .catch(() => {
          wrapper.classList.add("img-missing");
          throw new VanillaTaggerError(
            `Can't load image => ${host.dataset.img}`
          );
        })
        .finally(() => {
          wrapper.classList.remove("img-loading");
        });

      let img = wrapper.querySelector("img") || document.createElement("img");
      img.setAttribute("src", imgObj.src);

      if (!wrapper.classList.contains("img-loaded"))
        //didn't have an image loaded before
        wrapper.appendChild(img);

      wrapper.classList.add("img-loaded");
      host.classList.remove("updating");

      _throwsEvent("imgLoaded", {
        src: imgObj.src,
        width: imgObj.width,
        height: imgObj.height,
      });
    }

    /*-----------------------------------------------------------------------------------------*/

    loadTags(jsonTags) {
      if (!jsonTags && !host.dataset.tags) {
        console.warn(
          "No attribute 'data-tags' found nor 'tags' parameter passed to method 'loadTags'"
        );
        return false;
      }

      host.resetTags();

      try {
        host.classList.add("updating");

        tags = jsonTags ? jsonTags : JSON.parse(host.dataset.tags);

        tags.forEach(function (tag, index) {
          tag.index = index + 1;
          _addTag(tag);
        });

        _throwsEvent("tagsLoaded", tags);
      } catch (err) {
        throw new VanillaTaggerError(`Error parsing tags data => ${err}`);
      } finally {
        host.classList.remove("updating");
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    resetTags() {
      try {
        if (!wrapper) return true;

        host.classList.add("updating");

        let allTags = wrapper.querySelectorAll(".tag, .popup");

        allTags.forEach(function (el) {
          wrapper.removeChild(el);
        });

        tags = [];

        _throwsEvent("tagsReset");
      } catch (err) {
        throw new VanillaTaggerError(`Error resetting tags => ${err}`);
      } finally {
        host.classList.remove("updating");
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    toggleAllPopups(force) {
      wrapper.classList.toggle("show-allpopups", force);
    }

    /*-----------------------------------------------------------------------------------------*/
  } //END WEBCOMPONENT CLASS

  /*-----------------------------------------------------------------------------------------*/
  /*------------------------------------ EXCEPTION CLASS ------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTaggerError extends Error {
    constructor(message) {
      super(message);
      this.name = "VanillaTaggerError";
      console.error(this);
    }
  } //END EXCEPTION CLASS

  /*-----------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS -----------------------------------*/
  /*-------------------------------------------------------------------------------------------*/

  const _createComponent = async function _createComponent() {
    host.classList.add("loading");

    await _applyStyles();

    wrapper = document.createElement("figure");
    wrapper.classList.add("wrapper");
    host.shadowRoot.appendChild(wrapper);

    _setObservers();

    host.classList.remove("loading");

    _throwsEvent("componentCreated");

    //we don't use slotted elements, to achieve maximum incapsulation
    host.loadImage().then(host.loadTags);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _applyStyles = async function _applyStyles() {
    let style = document.createElement("style");
    style.appendChild(document.createTextNode(baseStyle));
    host.shadowRoot.appendChild(style);

    const link = await _fetchStyle(themeUrl).catch(() => {
      throw new VanillaTaggerError(`Can't load theme => ${themeUrl}`);
    });

    host.shadowRoot.appendChild(link);

    const smallBp = getComputedStyle(host).getPropertyValue(
      "--format-small-trigger"
    );

    if (smallBp) breakpoints.small = parseInt(smallBp, 10);

    _throwsEvent("themeLoaded", themeUrl);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _fetchStyle = async function _fetchStyle(url) {
    return new Promise((resolve, reject) => {
      let link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.onload = () => {
        resolve(link);
      };
      link.href = url;

      host.shadowRoot.appendChild(link);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _setObservers = function _setObservers() {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const cr = entry.contentRect,
          currentWidth = parseInt(cr.width, 10);

        _checkFormat(currentWidth);
      }
    });

    resizeObserver.observe(wrapper);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _checkFormat = function _checkFormat(currentWidth) {
    if (!loggedWidth && currentWidth <= breakpoints.small) {
      wrapper.classList.add("small-format");
      _throwsEvent("formatTriggered", {
        state: true,
        format: "small",
        breakpoint: breakpoints.small,
      });
    } else {
      if (
        currentWidth <= breakpoints.small &&
        loggedWidth > breakpoints.small
      ) {
        wrapper.classList.add("small-format");
        _throwsEvent("formatTriggered", {
          state: true,
          format: "small",
          breakpoint: breakpoints.small,
        });
      } else if (
        currentWidth > breakpoints.small &&
        loggedWidth <= breakpoints.small
      ) {
        wrapper.classList.remove("small-format");
        _throwsEvent("formatTriggered", {
          state: false,
          format: "small",
          breakpoint: breakpoints.small,
        });
      }
    }

    loggedWidth = currentWidth;
  };

  /*-----------------------------------------------------------------------------------------*/

  const _throwsEvent = function _throwsEvent(name, data) {
    if (!host) return false;

    let evt = new CustomEvent("VanillaTagger:" + name, {
      bubbles: true,
      detail: data,
    });

    host.dispatchEvent(evt);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _fetchImage = async function _fetchImage(src) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addTag = function _addTag(tag) {
    try {
      let element = document.createElement("a");

      wrapper.appendChild(element);

      _attachProperties(element, tag);

      _attachMethods(tag);

      _attachPopup(element, tag);

      _attachEvents("click mouseover mouseout", element, tag);

      _throwsEvent("tagAdded", tag);
    } catch (err) {
      console.warn("Can't render tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error rendering tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachProperties = function _attachProperties(element, tag) {
    try {
      element.classList.add("tag");
      element.dataset.index = tag.index;
      element.style.top = `${tag.top}%`;
      element.style.left = `${tag.left}%`;
      if (tag.caption) element.dataset.caption = tag.caption;
      if (tag.width) element.style.width = `${tag.width}%`;
      if (tag.height) element.style.height = `${tag.height}%`;
      if (!tag.id) {
        tag.id = "tag-" + tag.index;
      }
      element.setAttribute("id", tag.id);

      if (!tag.width || !tag.height) element.classList.add("dot");
      else element.classList.add("hotspot");

      if (tag.classes) {
        tag.classes.split(" ").forEach(function (cl, index) {
          element.classList.add(cl);
        });
      }

      if (tag.link && tag.link.href) {
        element.setAttribute("href", tag.link.href);
        if (tag.link.target) element.setAttribute("target", tag.link.target);
      }
    } catch (err) {
      console.warn("Can't attach properties to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(
        `Error attaching properties to tag => ${err}`
      );
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachMethods = function _attachMethods(tag) {
    try {
      tag.addClass = function (className) {
        return _addClass(_getElement(tag), className);
      };
      tag.removeClass = function (className) {
        return _removeClass(_getElement(tag), className);
      };
      tag.toggleClass = function (className, force) {
        return _toggleClass(_getElement(tag), className, force);
      };
      tag.hasClass = function (className) {
        return _hasClass(_getElement(tag), className);
      };

      tag.addClassToPopup = function (className) {
        return _addClass(_getPopupElement(tag), className);
      };
      tag.removeClassFromPopup = function (className) {
        return _removeClass(_getPopupElement(tag), className);
      };
      tag.toggleClassOfPopup = function (className, force) {
        return _toggleClass(_getPopupElement(tag), className, force);
      };
      tag.popupHasClass = function (className) {
        return _hasClass(_getPopupElement(tag), className);
      };
    } catch (err) {
      console.warn("Can't attach methods to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error attaching methods to tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _getElement = function _getElement(tag) {
    return wrapper.querySelector(".tag[data-index='" + tag.index + "']");
  };

  /*-----------------------------------------------------------------------------------------*/

  const _getPopupElement = function _getPopupElement(tag) {
    return wrapper.querySelector(".popup[data-index='" + tag.index + "']");
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addClass = function _addClass(el, className) {
    return el.classList.add(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _removeClass = function _removeClass(el, className) {
    return el.classList.remove(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _toggleClass = function _toggleClass(el, className, force) {
    return el.classList.toggle(className, force);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _hasClass = function _hasClass(el, className) {
    return el.classList.contains(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachPopup = function _attachPopup(element, tag) {
    if (!tag.popup) return false;

    try {
      let popup, config;

      config = {
        content: tag.popup.content || tag.popup,
        classes: tag.popup.classes || "black",
        arrow: tag.popup.arrow || "center",
        position: tag.popup.position || (tag.left > 50 ? "left" : "right"),
        showOn: tag.popup.showOn || "hover",
      };

      popup = document.createElement("p");

      popup.dataset.index = tag.index;

      popup.innerHTML = config.content;

      popup.classList.add("popup");
      popup.classList.add(config.showOn);
      popup.classList.add(config.position);
      popup.classList.add("arrow-" + config.arrow);
      config.classes.split(" ").forEach(function (cl, index) {
        popup.classList.add(cl);
      });

      if (popup.classList.contains("closeable")) {
        let closeButton = document.createElement("a");
        closeButton.classList.add("close");

        closeButton.addEventListener("click", function (e) {
          tag.removeClass("show-popup");
          tag.removeClass("toggled");
          _throwsEvent("popupClosedByClick", tag);
        });

        popup.appendChild(closeButton);
      }

      wrapper.insertBefore(popup, element.nextSibling); //insertAfter

      requestAnimationFrame(function () {
        _repositionPopup(tag);
      });
    } catch (err) {
      console.warn("Can't attach popup to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error attaching popup to tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _repositionPopup = function _repositionPopup(tag) {
    try {
      if (!tag.popup) return false;

      let element = _getElement(tag),
        popup = _getPopupElement(tag);

      if (!element || !popup) return false;

      let config = {
          arrow: tag.popup.arrow || "center",
          position: tag.popup.position || (tag.left > 50 ? "left" : "right"),
        },
        top,
        left;

      if (
        tag.height &&
        (config.position === "right" || config.position === "left")
      ) {
        if (config.arrow === "top") top = `${tag.top}%`;
        else if (config.arrow === "center")
          top = `calc(${tag.top}% + (${element.offsetHeight}px / 2))`;
        else if (config.arrow == "bottom")
          top = `calc(${tag.top}% + (${element.offsetHeight}px))`;
      } else if (tag.height && config.position === "bottom") {
        top = `calc(${tag.top}% + ${element.offsetHeight}px)`;
      } else if (config.position === "top") {
        top = `calc(${tag.top}% - ${popup.offsetHeight}px)`;
      } else top = `${tag.top}%`;

      if (config.position === "right") {
        if (tag.width) left = `calc(${tag.left}% + ${element.offsetWidth}px)`;
        else left = `${tag.left}%`;
      } else if (config.position === "left") {
        left = `calc(${tag.left}% - ${popup.offsetWidth}px)`;
      } else if (
        tag.width &&
        (config.position === "bottom" || config.position === "top") &&
        config.arrow === "center"
      ) {
        left = `calc(${tag.left}% + (${element.offsetWidth}px / 2))`;
      } else if (
        tag.width &&
        (config.position === "bottom" || config.position === "top") &&
        config.arrow === "right"
      ) {
        left = `calc(${tag.left}% + (${element.offsetWidth}px))`;
      } else {
        left = `${tag.left}%`;
      }

      popup.style.top = top;
      popup.style.left = left;
    } catch (err) {
      console.warn("Can't reposition popup for tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(
        `Error repositioning popup for tag => ${err}`
      );
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachEvents = function _attachEvents(eventNames, element, tag) {
    try {
      if (eventNames) {
        eventNames.split(" ").forEach(function (evt, index) {
          let eventName = evt,
            eventNameToThrow =
              "tag" + eventName.charAt(0).toUpperCase() + eventName.slice(1);

          element.addEventListener(eventName, function (e) {
            _throwsEvent(eventNameToThrow, tag);

            if (eventName === "click") tag.toggleClass("toggled");

            if (tag["on" + eventName]) {
              //eval(tag["on"+eventName])(tag); //you wish! ..nah... not really possible for well known security concerns

              const fname = tag["on" + eventName],
                f = window[fname];

              if (f && typeof f === "function") f(tag);
            }
          });
        });
      }
    } catch (err) {
      console.warn("Can't attach events to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error attaching events to tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
  customElements.define("vanilla-tagger", VanillaTagger);
  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
