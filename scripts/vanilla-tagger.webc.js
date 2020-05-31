'use strict';

(function() {

/*-----------------------------------------------------------------------------------------*/

let host, wrapper, tags;

/*-----------------------------------------------------------------------------------------*/

const baseStyle = `

    :host{
        display: inline-block;
        object-fit: fill;        
        box-sizing: border-box;
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

const themeStyle = `
    @import "styles/vanilla-tagger.theme.css";
`;

/*-----------------------------------------------------------------------------------------*/

class VanillaTaggerError extends Error {
    constructor(message) {
      super(message);
      this.name = 'VanillaTaggerError';
      console.error(this);
    }
}

/*-----------------------------------------------------------------------------------------*/

class VanillaTagger extends HTMLElement {

    constructor() {
        super();
        host = this,
        host.attachShadow({mode: "open"});
}

/*-----------------------------------------------------------------------------------------*/    

    connectedCallback() {
        host._createComponent();
        host._throwsEvent("componentCreated");     
    }    

/*-----------------------------------------------------------------------------------------*/

  _createComponent() {
        let style = document.createElement("style");
        style.appendChild(document.createTextNode(baseStyle));
        host.shadowRoot.appendChild(style);

        style = document.createElement("style");
        style.appendChild(document.createTextNode(themeStyle));
        host.shadowRoot.appendChild(style);

        wrapper = document.createElement("figure");
        wrapper.classList.add("wrapper");
        host.shadowRoot.appendChild(wrapper);

        host._loadImage()
            .then(host._loadTags);  
    }

/*-----------------------------------------------------------------------------------------*/    

    _throwsEvent(name,data) {
       
        let evt = new CustomEvent("VanillaTagger:" + name , {'bubbles': true , 'detail': data });

        host.dispatchEvent(evt);
    }
    
/*-----------------------------------------------------------------------------------------*/    

    async _loadImage() {

        if (!host.dataset.img)  {
            console.warn("No attribute data-img found");
            return false;
        }

        wrapper.classList.add("imgLoading");

        const imgObj = await host._fetchImage(host.dataset.img)
                                .catch(() => {
                                    wrapper.classList.add("imgMissing");
                                    throw new VanillaTaggerError(`Can't load image => ${host.dataset.img}`);
                                })
                                .finally(() => {
                                    wrapper.classList.remove("imgLoading");
                                });  

        host._throwsEvent("imgLoaded",{src: imgObj.src, width: imgObj.width, height: imgObj.height});     

        wrapper.classList.add("imgLoaded");                                

        let img = document.createElement("img");
        img.setAttribute("src",imgObj.src)
        wrapper.appendChild(img);

    }    

/*-----------------------------------------------------------------------------------------*/    

    async _fetchImage(src) { 
        return new Promise((resolve, reject) => { 
            let img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        });
    }    

/*-----------------------------------------------------------------------------------------*/    

    _loadTags() {
        if (!host.dataset.tags)  {
            console.warn("No attribute data-tags found");
            return false;
        }

        try {
             tags = JSON.parse(host.dataset.tags);

             tags.forEach(function (tag,index) {
                tag.index = index+1; 
                host._addTag(tag);
             });

             host._throwsEvent("tagsLoaded",tags);     

        } catch(err) {
             throw new VanillaTaggerError(`Error parsing tags data => ${err}`)
        }        
    }    
    
/*-----------------------------------------------------------------------------------------*/    

    _addTag(tag) {
        
        try {
            let a = document.createElement("a");

            host._attachProperties(a,tag);

            host._attachEvents("click mouseover mouseout",a,tag);

            wrapper.appendChild(a);

            host._throwsEvent("tagAdded",tag);     

            } catch(err) {
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

            if (!tag.id) {
                tag.id = "tag-" + tag.index; 
            };

            element.setAttribute("id",tag.id);

            if (tag.classes) {
                tag.classes.split(" ").forEach(function (cl, index) {
                    element.classList.add(cl);
                });
            };

            if (tag.link && tag.link.href) {
                element.setAttribute("href",tag.link.href);
                if (tag.link.target) element.setAttribute("target",tag.link.target);
            };
        
        } catch(err) {
            console.warn("Can't attach properties to tag:" + JSON.stringify(tag));
            throw new VanillaTaggerError(`Error attaching properties to tag => ${err}`);
        }

    }

/*-----------------------------------------------------------------------------------------*/    

    _attachEvents(eventNames, element, tag) {

        try {

            tag.element = element;

            if (eventNames) {
                eventNames.split(" ").forEach(function (evt, index) {
                    let eventName = evt,
                        eventNameToThrow = "tag" + eventName.charAt(0).toUpperCase() + eventName.slice(1);

                    element.addEventListener(eventName,function (e) {
                        host._throwsEvent(eventNameToThrow,tag);

                        if (tag["on"+eventName] )   eval(tag["on"+eventName])(tag); 
                    });

                });
            };

        
        } catch(err) {
            console.warn("Can't attach events to tag:" + JSON.stringify(tag));
            throw new VanillaTaggerError(`Error attaching events to tag => ${err}`);
        }        
    }

/*-----------------------------------------------------------------------------------------*/    


}


customElements.define("vanilla-tagger", VanillaTagger);

})();