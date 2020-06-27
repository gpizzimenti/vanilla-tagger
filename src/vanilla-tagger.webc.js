"use strict";

//TODO: loading/missing/error states (CSS)
//TODO: add other icons (CSS)
//TODO: breakpoints as data- in :host

(function () {
  /*-----------------------------------------------------------------------------------------*/
  /*-------------------------------- PRIVATE PROPERTIES -------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  let reservedClasses = ["tag", "popup", "dot", "hotspot", "area"];

  /*-----------------------------------------------------------------------------------------*/

  const baseStyle = `

    :host{
        display: inline-block;
        box-sizing: border-box;
        contain: layout;
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
        display: none;
        pointer-events: none;
    }
    
    .img-loaded .tag {
      display: block;
      pointer-events: inherit;
  }    
  
`;

  /*-----------------------------------------------------------------------------------------*/

  const themeUrl =
    document.currentScript.src.substring(
      0,
      document.currentScript.src.lastIndexOf("/") + 1
    ) + "vanilla-tagger.theme.css";

  /*-----------------------------------------------------------------------------------------*/
  /*---------------------------------- WEBCOMPONENT CLASS -----------------------------------*/
  /*-----------------------------------------------------------------------------------------*/

  class VanillaTagger extends HTMLElement {
    static get observedAttributes() {
      return ["src", "data-tags", "data-theme", "data-theme-text"];
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    constructor() {
      super();

      this.context = {};
      this.context.tags = [];
      this.context.wrapper = undefined;
      this.context.resizeObserver = undefined;
      this.context.loggedWidth = undefined;
      this.context.breakpoints = {
        small: 640, //default.. you can alter this through the "--format-small-trigger" CSS variable in vanilla-tagger.theme.css
      };

      this.attachShadow({ mode: "open" });
    }

    /*---------------------------------------------------------------------------------------*/

    get src() {
      return this.getAttribute("src");
    }

    /*---------------------------------------------------------------------------------------*/

    set src(value) {
      this.setAttribute("src", value);
    }

    /*---------------------------------------------------------------------------------------*/

    get theme() {
      return this.dataset.theme;
    }
    /*---------------------------------------------------------------------------------------*/

    set theme(value) {
      this.dataset.theme = value;
    }

    /*---------------------------------------------------------------------------------------*/

    get themeText() {
      return this.dataset.themeText;
    }
    /*---------------------------------------------------------------------------------------*/

    set themeText(value) {
      this.dataset.themeText = value;
    }

    /*---------------------------------------------------------------------------------------*/

    get tags() {
      return this.context.tags;
    }

    /*---------------------------------------------------------------------------------------*/

    set tags(value) {
      this.dataset.tags = JSON.stringify(value);
    }

    /*---------------------------------------------------------------------------------------*/

    connectedCallback() {
      _render(this);
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

      if (name === "src") _loadImage(this);
      else if (name === "data-tags") _loadTags(this);
      else if (name === "data-theme" || name === "data-theme-text")
        _applyStyles(this);
    }

    /*----------------------------------------------------------------------------------------*/

    getTagByIndex(index) {
      return this.context.tags[index - 1];
    }

    /*----------------------------------------------------------------------------------------*/

    getTagById(id) {
      return this.context.tags.find((tag) => {
        return tag.id === id;
      });
    }

    /*----------------------------------------------------------------------------------------*/

    highlightTag(options) {
      _highlightTag(this, options);
    }

    /*----------------------------------------------------------------------------------------*/

    toggleAllPopups(force) {
      this.context.wrapper.classList.toggle("show-allpopups", force);
    }

    /*----------------------------------------------------------------------------------------*/

    loadImage() {
      _loadImage(this);
    }

    /*----------------------------------------------------------------------------------------*/

    loadTags() {
      _loadTags(this);
    }

    /*----------------------------------------------------------------------------------------*/

    applyStyles() {
      _applyStyles(this);
    }

    /*----------------------------------------------------------------------------------------*/
  } //END WEBCOMPONENT CLASS

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------ EXCEPTION CLASS -------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  class VanillaTaggerError extends Error {
    constructor(message) {
      super(message);
      this.name = "VanillaTaggerError";
      console.error(this);
    }
  } //END EXCEPTION CLASS

  /*------------------------------------------------------------------------------------------*/
  /*------------------------------------- PRIVATE METHODS ------------------------------------*/
  /*------------------------------------------------------------------------------------------*/

  const _render = async function _render(host) {
    host.classList.add("loading");

    await _applyStyles(host); //no FOUC + we need correct dimensions to render popups correctly

    host.context.wrapper = document.createElement("figure");
    host.context.wrapper.classList.add("wrapper");
    host.shadowRoot.appendChild(host.context.wrapper);

    _setObservers(host);

    host.classList.remove("loading");

    _throwEvent(host, "componentCreated");

    //we don't use slotted elements, to achieve maximum incapsulation
    _loadImage(host).then(_loadTags(host));
  };

  /*-----------------------------------------------------------------------------------------*/

  const _applyStyles = async function _applyStyles(host) {
    let componentStyles = host.shadowRoot.querySelectorAll("style, link");

    componentStyles.forEach(function (el) {
      host.shadowRoot.removeChild(el);
    });

    let style = document.createElement("style");
    style.appendChild(document.createTextNode(baseStyle));
    host.shadowRoot.insertBefore(style, host.shadowRoot.firstChild); //prepend

    if (host.dataset.themeText) {
      let styleCustom = document.createElement("style");
      styleCustom.appendChild(document.createTextNode(host.dataset.themeText));
      host.shadowRoot.insertBefore(styleCustom, host.shadowRoot.firstChild); //prepend
    } else {
      let urlTheme = host.dataset.theme ? host.dataset.theme : themeUrl;
      const link = await _fetchStyle(urlTheme, host).catch(() => {
        throw new VanillaTaggerError(`Can't load theme => ${themeUrl}`);
      });
    }

    const smallBp = getComputedStyle(host).getPropertyValue(
      "--format-small-trigger"
    );

    if (smallBp) host.context.breakpoints.small = parseInt(smallBp, 10);

    _throwEvent(host, "themeLoaded", themeUrl);
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

      host.shadowRoot.insertBefore(link, host.shadowRoot.firstChild); //prepend
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _setObservers = function _setObservers(host) {
    host.context.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const cr = entry.contentRect,
          currentWidth = parseInt(cr.width, 10);

        requestAnimationFrame(function () {
          _checkFormat(host, currentWidth);
        });
        requestAnimationFrame(function () {
          _repositionPopups(host);
        });
      }
    });

    host.context.resizeObserver.observe(host.context.wrapper);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _checkFormat = function _checkFormat(host, currentWidth) {
    if (
      !host.context.loggedWidth &&
      currentWidth <= host.context.breakpoints.small
    ) {
      host.context.wrapper.classList.add("small-format");
      _throwEvent(host, "formatTriggered", {
        state: true,
        format: "small",
        breakpoint: host.context.breakpoints.small,
      });
    } else {
      if (
        currentWidth <= host.context.breakpoints.small &&
        host.context.loggedWidth > host.context.breakpoints.small
      ) {
        host.context.wrapper.classList.add("small-format");
        _throwEvent(host, "formatTriggered", {
          state: true,
          format: "small",
          breakpoint: host.context.breakpoints.small,
        });
      } else if (
        currentWidth > host.context.breakpoints.small &&
        host.context.loggedWidth <= host.context.breakpoints.small
      ) {
        host.context.wrapper.classList.remove("small-format");
        _throwEvent(host, "formatTriggered", {
          state: false,
          format: "small",
          breakpoint: host.context.breakpoints.small,
        });
      }
    }

    host.context.loggedWidth = currentWidth;
  };

  /*-----------------------------------------------------------------------------------------*/

  const _throwEvent = function _throwEvent(host, name, data) {
    if (!host) return false;

    let evt = new CustomEvent("VanillaTagger:" + name, {
      bubbles: true,
      detail: data,
    });

    host.dispatchEvent(evt);
  };

  /*----------------------------------------------------------------------------------------*/

  const _loadImage = async function _loadImage(host) {
    if (!host.getAttribute("src")) {
      console.warn("No 'src' parameter set");
      return false;
    }

    host.classList.add("updating");
    host.context.wrapper.classList.add("img-loading");

    const imgObj = await _fetchImage(host.getAttribute("src"))
      .catch(() => {
        host.context.wrapper.classList.add("img-missing");
        throw new VanillaTaggerError(
          `Can't load image => ${host.getAttribute("src")}`
        );
      })
      .finally(() => {
        host.context.wrapper.classList.remove("img-loading");
      });

    let img =
      host.context.wrapper.querySelector("img.img-tagged") ||
      document.createElement("img");

    img.setAttribute("src", imgObj.src);
    img.classList.add("img-tagged");

    if (!host.context.wrapper.classList.contains("img-loaded"))
      //didn't have an image loaded before
      host.context.wrapper.appendChild(img);

    host.context.wrapper.classList.add("img-loaded");
    host.classList.remove("updating");

    _throwEvent(host, "imgLoaded", {
      src: imgObj.src,
      width: imgObj.width,
      height: imgObj.height,
    });
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

  const _loadTags = function _loadTags(host) {
    if (!host.dataset.tags) {
      console.warn("No attribute 'data-tags' found");
      return false;
    }

    _resetTags(host);

    try {
      host.classList.add("updating");

      host.context.wrapper.classList.remove("dim-alltags");
      host.context.wrapper.classList.remove("show-allpopups");

      host.context.tags = JSON.parse(host.dataset.tags);

      host.context.tags.forEach(function (tag, index) {
        tag.index = index + 1;
        _addTag(host, tag);
      });

      _throwEvent(host, "tagsLoaded", host.context.tags);
    } catch (err) {
      throw new VanillaTaggerError(`Error parsing tags data => ${err}`);
    } finally {
      host.classList.remove("updating");
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _resetTags = function _resetTags(host) {
    try {
      if (!host.context.wrapper) return true;

      let allElements = host.context.wrapper.querySelectorAll(".tag, .popup");

      allElements.forEach(function (el) {
        host.context.wrapper.removeChild(el);
      });

      host.context.tags = [];
    } catch (err) {
      throw new VanillaTaggerError(`Error resetting tags => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addTag = function _addTag(host, tag) {
    try {
      let element = document.createElement("a");

      host.context.wrapper.appendChild(element);

      _attachProperties(host, element, tag);

      _attachMethods(host, tag);

      _attachPopup(host, element, tag);

      _attachEvents("click touchstart mouseover mouseout", host, element, tag);

      _throwEvent(host, "tagAdded", tag);
    } catch (err) {
      console.warn("Can't render tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error rendering tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachProperties = function _attachProperties(host, element, tag) {
    try {
      element.classList.add("tag");
      element.dataset.index = tag.index;
      tag.indexAlphabetical = _alphabeticalIndex(tag.index);
      element.dataset.indexAlphabetical = tag.indexAlphabetical;
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

  const _alphabeticalIndex = function _alphabeticalIndex(index) {
    let str = "",
      multiples = Math.ceil(index / 26),
      charAtCode = index - (multiples - 1) * 26;

    for (let i = 0; i < multiples; i++)
      str += String.fromCharCode(charAtCode + 64);

    return str;
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachMethods = function _attachMethods(host, tag) {
    try {
      tag.addClass = function (classNames) {
        return _addClass(_getElement(host, tag), classNames, tag);
      };
      tag.removeClass = function (classNames) {
        return _removeClass(_getElement(host, tag), classNames, tag);
      };
      tag.toggleClass = function (className) {
        if (tag.classes.indexOf(className) > -1) tag.removeClass(className);
        else tag.addClass(className);
      };
      tag.hasClass = function (className) {
        return _hasClass(_getElement(host, tag), className);
      };
      tag.addClassToPopup = function (className) {
        return _addClass(_getPopupElement(host, tag), className, tag.popup);
      };
      tag.removeClassFromPopup = function (className) {
        return _removeClass(_getPopupElement(host, tag), className, tag.popup);
      };
      tag.toggleClassOfPopup = function (className) {
        if (tag.popup.classes.indexOf(className) > -1)
          tag.popup.removeClass(className);
        else tag.popup.addClass(className);
      };
      tag.popupHasClass = function (className) {
        return _hasClass(_getPopupElement(host, tag), className);
      };

      tag.setPopup = function (popup) {
        if (!popup) return false;
        tag.popup = popup;

        let popupEl = _getPopupElement(host, tag);
        if (popupEl) host.context.wrapper.removeChild(popupEl);
        _attachPopup(host, _getElement(host, tag), tag);
      };
    } catch (err) {
      console.warn("Can't attach methods to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error attaching methods to tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _getElement = function _getElement(host, tag) {
    return host.context.wrapper.querySelector(
      ".tag[data-index='" + tag.index + "']"
    );
  };

  /*-----------------------------------------------------------------------------------------*/

  const _getPopupElement = function _getPopupElement(host, tag) {
    return host.context.wrapper.querySelector(
      ".popup[data-index='" + tag.index + "']"
    );
  };

  /*-----------------------------------------------------------------------------------------*/

  const _addClass = function _addClass(element, classNames, data) {
    if (!classNames) return false;
    classNames.split(" ").forEach(function (className) {
      if (data && data.classes.indexOf(className) < 0)
        data.classes = data.classes + " " + className;

      element.classList.add(className);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _removeClass = function _removeClass(element, classNames, data) {
    if (!classNames) return false;
    classNames.split(" ").forEach(function (className) {
      if (data && data.classes)
        data.classes = data.classes
          .replace(className, "")
          .replace("  ", " ")
          .trim();

      element.classList.remove(className);
    });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _hasClass = function _hasClass(element, className) {
    if (!className) return false;
    return element.classList.contains(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachPopup = function _attachPopup(host, element, tag) {
    if (!tag.popup) return false;

    try {
      let popup, config;

      config = {
        content: tag.popup.content || tag.popup,
        classes: tag.popup.classes || "xdark",
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
          e.stopPropagation();
          tag.removeClass("show-popup toggled");
          _throwEvent(host, "popupClosedByClick", tag);
        });

        popup.appendChild(closeButton);
      }

      popup.addEventListener("click", function (e) {
        _throwEvent(host, "popupClick", {
          tag: tag,
          path: e.path || (e.composedPath && e.composedPath()),
        });
      });

      host.context.wrapper.insertBefore(popup, element.nextSibling); //insertAfter

      requestAnimationFrame(function () {
        _repositionPopup(host, tag);
      });
    } catch (err) {
      console.warn("Can't attach popup to tag:" + JSON.stringify(tag));
      throw new VanillaTaggerError(`Error attaching popup to tag => ${err}`);
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _repositionPopup = function _repositionPopup(host, tag) {
    try {
      if (!tag || !tag.popup) return false;

      let element = _getElement(host, tag),
        popup = _getPopupElement(host, tag);

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

  const _repositionPopups = function _repositionPopups(host) {
    let popups = host.context.wrapper
      .querySelectorAll(".popup")
      .forEach(function (popup) {
        requestAnimationFrame(function () {
          _repositionPopup(host, host.context.tags[popup.dataset.index]);
        });
      });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _highlightTag = function _highlightTag(host, options) {
    let hightlightedTags = [];

    if (!options || !options.tag || !options.state || options.exclusive) {
      hightlightedTags = host.context.tags.filter(function (tag) {
        return tag.hasClass("highlight");
      });
    }

    if (!options || !options.tag) {
      hightlightedTags.forEach(function (tag) {
        tag.removeClass(
          "highlight" +
            (options && options.highlightedClasses
              ? " " + options.highlightedClasses
              : "")
        );
      });

      host.context.wrapper.classList.remove("dim-alltags");
      return false;
    }

    if (options.state) {
      host.context.wrapper.classList.add("dim-alltags");

      if (options.exclusive) {
        hightlightedTags.forEach(function (tag) {
          tag.removeClass(
            "highlight" +
              (options.highlightedClasses
                ? " " + options.highlightedClasses
                : "")
          );
        });
      }

      options.tag.addClass(
        "highlight" +
          (options.highlightedClasses ? " " + options.highlightedClasses : "")
      );

      _getElement(host, options.tag).scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });

      requestAnimationFrame(function () {
        _repositionPopup(host, options.tag);
      });
    } else {
      options.tag.removeClass(
        "highlight" +
          (options.highlightedClasses ? " " + options.highlightedClasses : "")
      );

      if (hightlightedTags.length < 2)
        host.context.wrapper.classList.remove("dim-alltags");
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachEvents = function _attachEvents(eventNames, host, element, tag) {
    try {
      if (eventNames) {
        eventNames.split(" ").forEach(function (evt, index) {
          let eventName = evt,
            eventNameNormalized = evt === "touchstart" ? "click" : eventName,
            eventNameToThrow =
              "tag" +
              eventNameNormalized.charAt(0).toUpperCase() +
              eventNameNormalized.slice(1);

          element.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();

            _throwEvent(host, eventNameToThrow, tag);

            if (eventNameNormalized === "click" || eventName === "mouseover") {
              requestAnimationFrame(function () {
                _repositionPopup(host, tag);
              });
            }

            if (eventNameNormalized === "click") tag.toggleClass("toggled");

            if (tag["on" + eventNameNormalized]) {
              //eval(tag["on"+eventName])(tag); //you wish! ..nah... not really possible for well known security concerns

              const fname = tag["on" + eventNameNormalized],
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

  if (!window.VanillaTagger) {
    window.VanillaTagger = VanillaTagger;

    customElements.define("vanilla-tagger", VanillaTagger);
  }

  /*-----------------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------------*/
})();
