"use strict";

//TODO: summary / navigation example
//TODO: loading/missing/error states (CSS)
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
    reservedClasses = ["tag", "popup", "dot", "hotspot", "area"],
    breakpoints = {
      small: 640, //default.. you can alter this through the "--format-small-trigger" CSS variable in vanilla-tagger.theme.css
    };

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
        display: block;
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
      return ["src", "data-tags"];
    }

    /*--------------------------------- CLASS METHODS ---------------------------------------*/

    constructor() {
      super();
      (host = this), host.attachShadow({ mode: "open" });
    }

    /*---------------------------------------------------------------------------------------*/

    get src() {
      return host.getAttribute("src");
    }

    /*---------------------------------------------------------------------------------------*/

    set src(value) {
      host.setAttribute("src", value);
    }

    /*---------------------------------------------------------------------------------------*/

    get tags() {
      return tags;
    }

    /*---------------------------------------------------------------------------------------*/

    set tags(value) {
      host.dataset.tags = JSON.stringify(value);
    }

    /*---------------------------------------------------------------------------------------*/

    connectedCallback() {
      _render();
    }

    /*---------------------------------------------------------------------------------------*/

    attributeChangedCallback(name, oldValue, newValue) {
      if (
        !host ||
        !wrapper ||
        host.classList.contains("updating") ||
        oldValue === newValue
      )
        return false;

      if (name === "src") _loadImage();
      else if (name === "data-tags") _loadTags();
    }

    /*----------------------------------------------------------------------------------------*/

    getTagByIndex(index) {
      return tags[index - 1];
    }

    /*----------------------------------------------------------------------------------------*/

    highlightTag(options) {
      _highlightTag(options);
    }

    /*----------------------------------------------------------------------------------------*/

    toggleAllPopups(force) {
      wrapper.classList.toggle("show-allpopups", force);
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

  const _render = async function _render() {
    host.classList.add("loading");

    await _applyStyles(); //no FOUC + we need correct dimensions to render popups correctly

    wrapper = document.createElement("figure");
    wrapper.classList.add("wrapper");
    host.shadowRoot.appendChild(wrapper);

    _setObservers();

    host.classList.remove("loading");

    _throwEvent("componentCreated");

    //we don't use slotted elements, to achieve maximum incapsulation
    _loadImage().then(_loadTags);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _applyStyles = async function _applyStyles() {
    let style = document.createElement("style");
    style.appendChild(document.createTextNode(baseStyle));
    host.shadowRoot.appendChild(style);

    const link = await _fetchStyle(themeUrl).catch(() => {
      throw new VanillaTaggerError(`Can't load theme => ${themeUrl}`);
    });

    const smallBp = getComputedStyle(host).getPropertyValue(
      "--format-small-trigger"
    );

    if (smallBp) breakpoints.small = parseInt(smallBp, 10);

    _throwEvent("themeLoaded", themeUrl);
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

        requestAnimationFrame(function () {
          _checkFormat(currentWidth);
        });
        requestAnimationFrame(function () {
          _repositionVisiblePopups();
        });
      }
    });

    resizeObserver.observe(wrapper);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _checkFormat = function _checkFormat(currentWidth) {
    if (!loggedWidth && currentWidth <= breakpoints.small) {
      wrapper.classList.add("small-format");
      _throwEvent("formatTriggered", {
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
        _throwEvent("formatTriggered", {
          state: true,
          format: "small",
          breakpoint: breakpoints.small,
        });
      } else if (
        currentWidth > breakpoints.small &&
        loggedWidth <= breakpoints.small
      ) {
        wrapper.classList.remove("small-format");
        _throwEvent("formatTriggered", {
          state: false,
          format: "small",
          breakpoint: breakpoints.small,
        });
      }
    }

    loggedWidth = currentWidth;
  };

  /*-----------------------------------------------------------------------------------------*/

  const _throwEvent = function _throwEvent(name, data) {
    if (!host) return false;

    let evt = new CustomEvent("VanillaTagger:" + name, {
      bubbles: true,
      detail: data,
    });

    host.dispatchEvent(evt);
  };

  /*----------------------------------------------------------------------------------------*/

  const _loadImage = async function _loadImage() {
    if (!host.getAttribute("src")) {
      console.warn("No 'src' parameter set");
      return false;
    }

    host.classList.add("updating");
    wrapper.classList.add("img-loading");

    const imgObj = await _fetchImage(host.getAttribute("src"))
      .catch(() => {
        wrapper.classList.add("img-missing");
        throw new VanillaTaggerError(
          `Can't load image => ${host.getAttribute("src")}`
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

    _throwEvent("imgLoaded", {
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

  const _loadTags = function _loadTags() {
    if (!host.dataset.tags) {
      console.warn("No attribute 'data-tags' found");
      return false;
    }

    if (tags.length > 0) _resetTags();

    try {
      host.classList.add("updating");

      wrapper.classList.remove("dim-alltags");
      wrapper.classList.remove("show-allpopups");

      tags = JSON.parse(host.dataset.tags);

      tags.forEach(function (tag, index) {
        tag.index = index + 1;
        _addTag(tag);
      });

      _throwEvent("tagsLoaded", tags);
    } catch (err) {
      throw new VanillaTaggerError(`Error parsing tags data => ${err}`);
    } finally {
      host.classList.remove("updating");
    }
  };

  /*-----------------------------------------------------------------------------------------*/

  const _resetTags = function _resetTags() {
    try {
      if (!wrapper) return true;

      let allElements = wrapper.querySelectorAll(".tag, .popup");

      allElements.forEach(function (el) {
        wrapper.removeChild(el);
      });

      tags = [];
    } catch (err) {
      throw new VanillaTaggerError(`Error resetting tags => ${err}`);
    }
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

      _throwEvent("tagAdded", tag);
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
        if (tag.classes.indexOf(className) < 0)
          tag.classes = tag.classes + " " + className;
        return _addClass(_getElement(tag), className, tag);
      };
      tag.removeClass = function (className) {
        tag.classes = tag.classes
          .replace(className, "")
          .replace("  ", " ")
          .trim();
        return _removeClass(_getElement(tag), className, tag);
      };
      tag.toggleClass = function (className) {
        if (tag.classes.indexOf(className) > -1) tag.removeClass(className);
        else tag.addClass(className);
      };
      tag.hasClass = function (className) {
        return _hasClass(_getElement(tag), className);
      };

      tag.addClassToPopup = function (className) {
        if (tag.popup.classes.indexOf(className) < 0)
          tag.popup.classes = tag.popup.classes + " " + className;
        return _addClass(_getPopupElement(tag), className, tag);
      };
      tag.removeClassFromPopup = function (className) {
        tag.popup.classes = tag.popup.classes
          .replace(className, "")
          .replace("  ", " ")
          .trim();
        return _removeClass(_getPopupElement(tag), className, tag);
      };
      tag.toggleClassOfPopup = function (className, force) {
        if (tag.popup.classes.indexOf(className) > -1)
          tag.popup.removeClass(className);
        else tag.popup.addClass(className);
      };
      tag.popupHasClass = function (className) {
        return _hasClass(_getPopupElement(tag), className);
      };

      tag.setPopup = function (popup) {
        tag.popup = popup;
        wrapper.removeChild(_getPopupElement(tag));
        _attachPopup(_getElement(tag), tag);
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

  const _addClass = function _addClass(element, className) {
    element.classList.add(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _removeClass = function _removeClass(element, className) {
    element.classList.remove(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _hasClass = function _hasClass(element, className) {
    return element.classList.contains(className);
  };

  /*-----------------------------------------------------------------------------------------*/

  const _attachPopup = function _attachPopup(element, tag) {
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
          tag.removeClass("show-popup");
          tag.removeClass("toggled");
          _throwEvent("popupClosedByClick", tag);
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

  const _repositionVisiblePopups = function _repositionPopups() {
    let popups = wrapper.querySelectorAll(".popup"),
      visibilePopus = [...popups]
        .filter(function (popup) {
          return (
            parseInt(getComputedStyle(popup).getPropertyValue("opacity"), 10) >
            0
          );
        })
        .forEach(function (popup) {
          requestAnimationFrame(function () {
            _repositionPopup(tags[popup.dataset.index]);
          });
        });
  };

  /*-----------------------------------------------------------------------------------------*/

  const _highlightTag = function _highlightTag(options) {
    let hightlightedTags = [];

    if (!options || !options.tag || !options.state || options.exclusive) {
      hightlightedTags = tags.filter(function (tag) {
        return tag.hasClass("highlight");
      });
    }

    if (!options || !options.tag) {
      hightlightedTags.forEach(function (tag) {
        tag.removeClass("highlight");
        tag.removeClass("show-popup");
      });

      wrapper.classList.remove("dim-alltags");
      return false;
    }

    if (options.state) {
      wrapper.classList.add("dim-alltags");

      if (options.exclusive) {
        hightlightedTags.forEach(function (tag) {
          tag.removeClass("highlight");
          tag.removeClass("show-popup");
        });
      }

      options.tag.addClass("highlight");
      if (options.showPopup) options.tag.addClass("show-popup");
    } else {
      options.tag.removeClass("highlight");
      options.tag.removeClass("show-popup");

      if (hightlightedTags.length < 2) wrapper.classList.remove("dim-alltags");
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
            _throwEvent(eventNameToThrow, tag);

            if (eventName === "click" || eventName === "mouseover") {
              requestAnimationFrame(function () {
                _repositionPopup(tag);
              });
            }

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
