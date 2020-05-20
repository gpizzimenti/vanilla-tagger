const wrapper = document.getElementById("taggerWrapper");
const layer = document.getElementById("taggerLayer");

let isDrawing = false;
let coordsStart;
let xStart ;
let yStart ;

/*-----------------------------------------------------------------------------------------*/

const toggleMode = function  toggleMode(chk,type) {

    let altMode =  ((type == "dots") ? "boxes" : "dots");

    document.getElementById("toggle-" + altMode).checked = false;
    wrapper.classList.remove('edit-'  + altMode);

    if (chk.checked) {
        wrapper.classList.add('edit-' + type);
    } else {
        wrapper.classList.remove('edit-'  + type);
    }
    
}

/*-----------------------------------------------------------------------------------------*/

const wrapperClick = function wrapperClick(event) {
    let  elem = event.target;

    if (elem.matches('.tag')) {
        alert("Hai cliccato il tag " + elem.dataset.tag);
    } else {

        if (!wrapper.classList.contains('edit-dots')) return false;

        let rect = event.target.getBoundingClientRect();
        let xClick = event.clientX - rect.left; 
        let yClick = event.clientY - rect.top;  
    
        addTag(percentCoords(xClick,yClick));
    }
}

/*-----------------------------------------------------------------------------------------*/

const percentCoords = function percentCoords(x,y) {
    let wrapperW = wrapper.clientWidth;
    let wrapperH = wrapper.clientHeight;

    let xperc=(100*x)/wrapperW;
    let yperc=(100*y)/wrapperH;

    return {x: xperc, y: yperc};
}


/*-----------------------------------------------------------------------------------------*/

const percentSizes = function percentSizes(w,h) {
    let wrapperW = wrapper.clientWidth;
    let wrapperH = wrapper.clientHeight;

    let wperc=(100*w)/wrapperW;
    let hperc=(100*h)/wrapperH;

    return {w: wperc, h: hperc};
}


/*-----------------------------------------------------------------------------------------*/

const addTag = function addTag(coords) {

    let tags = wrapper.getElementsByClassName("tag");

    let tag = document.createElement('button');
        tag.innerHTML = tags.length+1;
        tag.classList.add('tag');
        tag.classList.add('dot');
        tag.dataset.tag = tags.length+1;
        tag.style.top = coords.y + "%";        
        tag.style.left = coords.x + "%";                

        wrapper.appendChild(tag);
}

/*-----------------------------------------------------------------------------------------*/

const addHotspot = function addHotspot(coords,sizes,persist) {

    let tags = wrapper.getElementsByClassName("tag");

    let tag = document.createElement('button');
        tag.innerHTML = tags.length+1;
        tag.classList.add('tag');
        tag.classList.add('hotspot');
        tag.dataset.tag = tags.length+1; 
        tag.style.top = coords.y + "%";        
        tag.style.left = coords.x + "%";                
        tag.style.height = sizes.h + "%";        
        tag.style.width = sizes.w + "%";                

        wrapper.appendChild(tag);
}

/*-----------------------------------------------------------------------------------------*/

const addGhost = function addGhost(coords,sizes) {

    let ghosts = wrapper.getElementsByClassName('ghost');

    for (const ghost of ghosts) {
        ghost.parentNode.removeChild(ghost);
    }

    let ghost = document.createElement('button');
        ghost.classList.add('tag');
        ghost.classList.add('ghost');
        ghost.classList.add('hotspot');
        ghost.style.top = coords.y + "%";        
        ghost.style.left = coords.x + "%";                
        ghost.style.width = sizes.w + "%";                
        ghost.style.height=  sizes.h + "%";                

        wrapper.appendChild(ghost);

}


/*-----------------------------------------------------------------------------------------*/

wrapper.addEventListener('mousedown', e => {
    if (!wrapper.classList.contains('edit-boxes')) return true;

    isDrawing = true;

    xStart = e.offsetX; 
    yStart = e.offsetY;  

    let rect = event.target.getBoundingClientRect();
    let xClick = event.clientX - rect.left; 
    let yClick = event.clientY - rect.top;  

    coordsStart = percentCoords(xClick,yClick);


});

wrapper.addEventListener('mousemove', e => {
    if (!wrapper.classList.contains('edit-boxes')) return true;

    if (isDrawing) {
        let xEnd = e.offsetX; 
        let yEnd = e.offsetY;  

        addGhost(coordsStart,percentSizes(xEnd-xStart,yEnd - yStart));
    }
});

wrapper.addEventListener('mouseup', e => {

    if (!wrapper.classList.contains('edit-boxes')) return wrapperClick(e);

    if (isDrawing) {
        isDrawing = false;

        let ghosts = wrapper.getElementsByClassName('ghost');

        for (const ghost of ghosts) {
            ghost.parentNode.removeChild(ghost);
        }

        let xEnd = e.offsetX; 
        let yEnd = e.offsetY;  

        addHotspot(coordsStart,percentSizes(xEnd-xStart,yEnd - yStart));

    
    }


});

  

addHotspot({y: 17.2, x:4.9},{h: 36.5, w:6.7});
addTag({y: 44.7584, x: 29.625});
addTag({y: 52.3792, x: 77.875});
addHotspot({y: 34.9925, x:50.8},{h: 21.6095, w:4});

