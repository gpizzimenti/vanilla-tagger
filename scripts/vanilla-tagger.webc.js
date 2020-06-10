"use strict";

//TODO: add method to update popup
//TODO: getElement/getPopup private methods
//TODO: loading/missing/error states (CSS only)
//TODO: sync state/attributes in method calls (?)
//TODO: public methods (?)

(function () {
  /*-----------------------------------------------------------------------------------------*/

  let host,
    wrapper,
    tags = [],
    elements = [],
    loggedWidth,
    breakpoints = {
      small: 640,
    };

  /*-----------------------------------------------------------------------------------------*/

  const baseStyle = `

    :host{
        display: inline-block;
        box-sizing: border-box;
    }

    :host([hidden]) { display: none }

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

  class VanillaTaggerError extends Error {
    constructor(message) {
      super(message);
      this.name = "VanillaTaggerError";
      console.error(this);
    }
  }

  /*-----------------------------------------------------------------------------------------*/

  class VanillaTagger extends HTMLElement {
    static get observedAttributes() {
      return ["data-img", "data-tags"];
    }

    constructor() {
      super();
      (host = this), host.attachShadow({ mode: "open" });
    }

    /*-----------------------------------------------------------------------------------------*/

    connectedCallback() {
      host._createComponent();
    }

    /*-----------------------------------------------------------------------------------------*/

    attributeChangedCallback(name, oldValue, newValue) {
      if (
        !host ||
        !wrapper ||
        host.classList.contains("updating") ||
        oldValue === newValue
      )
        return false;

      if (name === "data-img") host._loadImage();
      else if (name === "data-tags") host._loadTags(undefined, true);
    }

    /*-----------------------------------------------------------------------------------------*/

    async _createComponent() {
      let style = document.createElement("style");
      style.appendChild(document.createTextNode(baseStyle));
      host.shadowRoot.appendChild(style);

      host.classList.add("loading");

      const link = await host
        ._fetchStyle(themeUrl)
        .catch(() => {
          throw new VanillaTaggerError(`Can't load theme => ${themeUrl}`);
        })
        .finally(() => {
          host.classList.remove("loading");
        });

      host.shadowRoot.appendChild(link);

      host._throwsEvent("themeLoaded", themeUrl);

      const smallBp = getComputedStyle(host).getPropertyValue(
        "--format-small-trigger"
      );

      if (smallBp) breakpoints.small = parseInt(smallBp, 10);

      wrapper = document.createElement("figure");
      wrapper.classList.add("wrapper");
      host.shadowRoot.appendChild(wrapper);

      host._setObservers();

      host._throwsEvent("componentCreated");

      //we don't use slotted elements, to achieve maximum incapsulation
      host._loadImage().then(host._loadTags);
    }

    /*-----------------------------------------------------------------------------------------*/

    _throwsEvent(name, data) {
      let evt = new CustomEvent("VanillaTagger:" + name, {
        bubbles: true,
        detail: data,
      });

      host.dispatchEvent(evt);
    }

    /*-----------------------------------------------------------------------------------------*/

    async _fetchStyle(url) {
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
    }

    /*-----------------------------------------------------------------------------------------*/

    _setObservers() {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const cr = entry.contentRect,
            currentWidth = parseInt(cr.width, 10);

          host._checkFormat(currentWidth);
        }
      });

      resizeObserver.observe(wrapper);
    }

    /*-----------------------------------------------------------------------------------------*/

    _checkFormat(currentWidth) {
      if (!loggedWidth && currentWidth <= breakpoints.small) {
        wrapper.classList.add("small-format");
        host._throwsEvent("formatTriggered", {
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
          host._throwsEvent("formatTriggered", {
            state: true,
            format: "small",
            breakpoint: breakpoints.small,
          });
        } else if (
          currentWidth > breakpoints.small &&
          loggedWidth <= breakpoints.small
        ) {
          wrapper.classList.remove("small-format");
          host._throwsEvent("formatTriggered", {
            state: false,
            format: "small",
            breakpoint: breakpoints.small,
          });
        }
      }

      loggedWidth = currentWidth;
    }

    /*-----------------------------------------------------------------------------------------*/

    async _loadImage(src) {
      if (!src && !host.dataset.img) {
        console.warn(
          "No attribute 'data-img' found nor 'src' parameter passed to method 'loadImage'"
        );
        return false;
      }

      wrapper.classList.add("img-loading");

      const imgObj = await host
        ._fetchImage(src || host.dataset.img)
        .catch(() => {
          wrapper.classList.add("img-missing");
          throw new VanillaTaggerError(
            `Can't load image => ${host.dataset.img}`
          );
        })
        .finally(() => {
          wrapper.classList.remove("img-loading");
        });

      wrapper.classList.add("img-loaded");

      let img = wrapper.querySelector("img") || document.createElement("img");
      img.setAttribute("src", imgObj.src);
      wrapper.appendChild(img);

      host._throwsEvent("imgLoaded", {
        src: imgObj.src,
        width: imgObj.width,
        height: imgObj.height,
      });
    }

    /*-----------------------------------------------------------------------------------------*/

    async _fetchImage(src) {
      return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    /*-----------------------------------------------------------------------------------------*/

    _loadTags(jsonTags, reset) {
      if (reset) {
        host._resetTags();
      }

      if (!jsonTags && !host.dataset.tags) {
        console.warn(
          "No attribute 'data-tags' found nor 'tags' parameter passed to method 'loadTags'"
        );
        return false;
      }

      try {
        tags = jsonTags ? jsonTags : JSON.parse(host.dataset.tags);

        tags.forEach(function (tag, index) {
          tag.index = elements.length + 1;
          host._addTag(tag);
        });

        host._throwsEvent("tagsLoaded", tags);
      } catch (err) {
        throw new VanillaTaggerError(`Error parsing tags data => ${err}`);
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    _resetTags() {
      try {
        if (!wrapper) return true;

        let allTags = wrapper.querySelectorAll(".tag, .popup");

        allTags.forEach(function (el) {
          wrapper.removeChild(el);
        });

        tags = [];
        elements = [];

        host._throwsEvent("tagsReset");

        console.table(elements);
      } catch (err) {
        throw new VanillaTaggerError(`Error resetting tags => ${err}`);
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    _addTag(tag) {
      try {
        let element = document.createElement("a");

        wrapper.appendChild(element);

        host._attachProperties(element, tag);

        host._attachMethods(tag);

        host._attachPopup(element, tag);

        host._attachEvents("click mouseover mouseout", element, tag);

        elements.push(element);

        host._throwsEvent("tagAdded", tag);
      } catch (err) {
        console.warn("Can't render tag:" + JSON.stringify(tag));
        throw new VanillaTaggerError(`Error rendering tag => ${err}`);
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    _attachProperties(element, tag) {
      try {
        element.classList.add("tag");
        element.dataset.index = tag.index;
        element.style.top = `${tag.top}%`;
        element.style.left = `${tag.left}%`;
        if (tag.width) element.style.width = `${tag.width}%`;
        if (tag.height) element.style.height = `${tag.height}%`;
        if (!tag.id) tag.id = "tag-" + tag.index;

        element.setAttribute("id", tag.id);

        if (!tag.width || !tag.width) element.classList.add("dot");
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
    }

    /*-----------------------------------------------------------------------------------------*/

    _attachPopup(element, tag) {
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

        wrapper.insertBefore(popup, element.nextSibling); //insertAfter

        requestAnimationFrame(function () {
          host._repositionPopup(tag);
        });
      } catch (err) {
        console.warn("Can't attach popup to tag:" + JSON.stringify(tag));
        throw new VanillaTaggerError(`Error attaching popup to tag => ${err}`);
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    _repositionPopup(tag) {
      try {
        if (!tag.popup) return false;

        let popup = wrapper.querySelector(
          ".popup[data-index='" + tag.index + "']"
        );

        if (!popup) return false;

        let element = elements[tag.index - 1];

        if (!element) return false;

        let config = {
            arrow: tag.popup.arrow || "center",
            position: tag.popup.position || (tag.left > 50 ? "left" : "right"),
          },
          top,
          left;

        if (config.position == "right") {
          top = `${tag.top}%`;
          if (tag.width) left = `calc(${tag.left}% + ${tag.offsetWidth}px)`;
          else left = `${tag.left}%`;
        } else if (config.position == "left") {
          top = `${tag.top}%`;
          left = `calc(${tag.left}% - ${popup.offsetWidth}px)`;
        } else if (config.position == "top") {
          top = `calc(${tag.top}% - ${popup.offsetHeight}px)`;
          left = `${tag.left}%`;
        } else if (config.position == "bottom") {
          if (tag.height) top = `calc(${tag.top}% + ${tag.offsetHeight}px)`;
          else top = `${tag.top}%`;
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
    }

    /*-----------------------------------------------------------------------------------------*/

    _attachMethods(tag) {
      try {
        tag.addClass = function (className) {
          elements[tag.index - 1].classList.add(className);
        };
        tag.removeClass = function (className) {
          elements[tag.index - 1].classList.remove(className);
        };
        tag.toggleClass = function (className) {
          elements[tag.index - 1].classList.toggle(className);
        };
        tag.hasClass = function (className) {
          return elements[tag.index - 1].classList.contains(className);
        };
      } catch (err) {
        console.warn("Can't attach methods to tag:" + JSON.stringify(tag));
        throw new VanillaTaggerError(
          `Error attaching methods to tag => ${err}`
        );
      }
    }

    /*-----------------------------------------------------------------------------------------*/

    _attachEvents(eventNames, element, tag) {
      try {
        if (eventNames) {
          eventNames.split(" ").forEach(function (evt, index) {
            let eventName = evt,
              eventNameToThrow =
                "tag" + eventName.charAt(0).toUpperCase() + eventName.slice(1);

            element.addEventListener(eventName, function (e) {
              host._throwsEvent(eventNameToThrow, tag);

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
    }

    /*-----------------------------------------------------------------------------------------*/
  }

  customElements.define("vanilla-tagger", VanillaTagger);
})();
