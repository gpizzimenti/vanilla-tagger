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
            .then( host._loadTags );  
    }
    
/*-----------------------------------------------------------------------------------------*/    

    async _loadImage() {

        if (!host.dataset.img)  throw new VanillaTaggerError('Missing attribute => data-img');
        
        wrapper.classList.add("imgLoading");

        const imgObj = await host._fetchImage(host.dataset.img)
                                .catch(() => {
                                    wrapper.classList.add("imgMissing");
                                    throw new VanillaTaggerError(`Can't load image => ${host.dataset.img}`);
                                })
                                .finally(() => {
                                    wrapper.classList.remove("imgLoading");
                                });  

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
        if (!host.dataset.tags)  throw new VanillaTaggerError('Missing attribute => data-tags');

        try {
             tags = JSON.parse(host.dataset.tags);

             tags.forEach(function (tag, index) {
                tag.index = index; 
                host._addTag(tag,index);
             });
 
        } catch(err) {
             throw new VanillaTaggerError(`Error parsing tags data => ${err}`)
        }        
    }    
    
/*-----------------------------------------------------------------------------------------*/    

    _addTag(tag) {
        try {
            let a = document.createElement("a");
            a.dataset.index=tag.index;
            a.classList.add("tag", tag.type);
            a.style.top = `${tag.top}%`;
            a.style.left = `${tag.left}%`;

            if (tag.link && tag.link.href) {
                a.setAttribute("href",tag.link.href);
                if (tag.link.target) a.setAttribute("target",tag.link.target);
            };

            if (tag.classes) {
                tag.classes.split(" ").forEach(function (cl, index) {
                    a.classList.add(cl);
                });
            };
        
            wrapper.appendChild(a);

            } catch(err) {
                console.warn("Can't render tag:" + JSON.stringify(tag));
                throw new VanillaTaggerError(`Error rendering tag => ${err}`);
        }        
    }

/*-----------------------------------------------------------------------------------------*/    


}


customElements.define("vanilla-tagger", VanillaTagger);

})();