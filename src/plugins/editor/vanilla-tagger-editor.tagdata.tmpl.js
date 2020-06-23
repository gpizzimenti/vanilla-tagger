window.VanillaTaggerEditorTemplates = window.VanillaTaggerEditorTemplates || {};

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.tagDefaultClasses =
  "with-border with-shadow pulsating-onhover responsive";

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.popupDefaultClasses = "light closeable";

window.VanillaTaggerEditorTemplates.popupDefaultProperties = {
  showOn: "toggle",
  arrow: "center",
};

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.tagForm = (tag) => `
<ul class="tagFields">
    <li>
        <label for="tag.properties.caption">Caption</label>
        <input type="text" name="tag.properties.caption" required value="${
          tag.caption ? tag.caption : ""
        }">
    </li>
    <li>
        <label for="tag.classes.show-index">Show Text</label>
        <select name="tag.classes.show-index">
            <option value="">None</option>
            <option value="show-index" ${
              (tag.classes.indexOf("show-index") > -1 &&
                tag.classes.indexOf("show-index-alphabetical")) < 0
                ? "selected"
                : ""
            }>Index numeric (0-9)</option>
            <option value="show-index show-index-alphabetical" ${
              tag.classes.indexOf("show-index-alphabetical") > -1
                ? "selected"
                : ""
            }>Index alphabetical (A-Z)</option>
            <option value="show-caption" ${
              tag.classes.indexOf("show-caption") > -1 ? "selected" : ""
            }>Caption</option>
        </select>
    </li>
    <li>
        <label for="tag.classes.colors">Color</label>
        <select name="tag.classes.color">
            <option value="red" ${
              tag.classes.indexOf("red") > -1 ? "selected" : ""
            }>Red</option>
            <option value="green" ${
              tag.classes.indexOf("green") > -1 ? "selected" : ""
            }>Green</option>
            <option value="blue" ${
              tag.classes.indexOf("blue") > -1 ? "selected" : ""
            }>Blue</option>
            <option value="xdark" ${
              tag.classes.indexOf("xdark") > -1 ? "selected" : ""
            }>Extra-Dark</option>
            <option value="dark" ${
              tag.classes.indexOf("xdark") < 0 &&
              tag.classes.indexOf("dark") > -1
                ? "selected"
                : ""
            }>Dark</option>
            <option value="xlight" ${
              tag.classes.indexOf("xlight") > -1 ? "selected" : ""
            }>Extra-Light</option>
            <option value="light" ${
              tag.classes.indexOf("xlight") < 0 &&
              tag.classes.indexOf("light") > -1
                ? "selected"
                : ""
            }>Light</option>
        </select>
   </li>
   <li>
      <label for="tag.classes.show-icon">Icon</label>
      <select name="tag.classes.show-icon">
        <option value="">none</option>
        <option value="icon-camera" ${
          tag.classes.indexOf("icon-camera") > -1 ? "selected" : ""
        }>Camera</option>
        <option value="icon-marker" ${
          tag.classes.indexOf("icon-marker") > -1 ? "selected" : ""
        }>Marker</option>
       </select> 
   </li>
   <fieldset>
    <legend>Popup</legend>
      <li>   
      <label for="popup.properties.position">Position</label>
      <select name="popup.properties.position">
        <option value="">auto</option>
        <option value="top"  ${
          tag.popup && tag.popup.position === "top" ? " selected" : ""
        }>top</option>
        <option value="bottom"  ${
          tag.popup && tag.popup.position === "bottom" ? " selected" : ""
        }>bottom</option>
        <option value="left"  ${
          tag.popup && tag.popup.position === "left" ? " selected" : ""
        }>left</option>
        <option value="right"  ${
          tag.popup && tag.popup.position === "right" ? " selected" : ""
        }>right</option>
     </select>
    </li>
    <li>   
        <label for="popup.meta.title">Title</label>
        <input type="text" name="popup.meta.title" required value="${
          tag.popup && tag.popup.meta && tag.popup.meta.title
            ? tag.popup.meta.title
            : ""
        }">
    </li>
    <li>   
        <label for="popup.meta.link">Link</label>
        <input type="url" name="popup.meta.link" required value="${
          tag.popup && tag.popup.meta && tag.popup.meta.link
            ? tag.popup.meta.link
            : ""
        }">
    </li>
    <li>   
        <label for="popup.meta.image">Image url</label>
        <input type="url" name="popup.meta.image" required value="${
          tag.popup && tag.popup.meta && tag.popup.meta.image
            ? tag.popup.meta.image
            : ""
        }">
    </li>
  </fieldset>  
</ul>    
`;

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.popupContent = (popup) => `
  <b>${popup.meta.title}</b>
  <br><br>
  <img width="220" src="${popup.meta.image}">
  <br><br>
  <a style="color: #9e9e9e; font-weight: bold; text-decoration: none;" href="${popup.meta.link}" target="blank">Open this link&nbsp;&#x2197;</a>
`;

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.buildTag = function buildTag(tag, form) {
  let formData = new FormData(form);

  tag.classes =
    "tag " +
    (tag.hasClass("dot") ? "dot " : "hotspot ") +
    window.VanillaTaggerEditorTemplates.tagDefaultClasses;

  let newPopup = {
    classes: window.VanillaTaggerEditorTemplates.popupDefaultClasses,
    arrow: "center",
    position: "top",
    showOn: "hover",
    content: "",
    meta: {},
  };

  for (var [key, value] of formData.entries()) {
    let element = key.split(".");

    if (element[0] === "tag") {
      if (element[1] === "properties") tag[element[2]] = value ? value : "";
      else if (element[1] === "classes") tag.addClass(value);
    } else if (element[0] === "popup") {
      if (element[1] === "properties") newPopup[element[2]] = value;
      else if (element[1] === "classes")
        newPopup.classes = newPopup.classes + " " + value;
      else if (element[1] === "meta") newPopup.meta[element[2]] = value;
    }
  }

  newPopup.content = window.VanillaTaggerEditorTemplates.popupContent(newPopup);
  tag.setPopup(newPopup);

  if (
    (tag.hasClass("show-index") || tag.hasClass("show-caption")) &&
    tag.classes.indexOf("icon-") > -1
  )
    tag.addClass("show-index-ontop");
  else tag.removeClass("show-index-ontop");

  tag.addClass("toggled");

  return tag;
};

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.processTags = function processTags(host) {
  let tags = [];

  host.tags.forEach(function (tag, index) {
    if (!tag.hasClass("blank")) {
      tag.removeClass("toggled");
      let publishedTag = { ...tag }; //clone

      Object.keys(
        window.VanillaTaggerEditorTemplates.popupDefaultProperties
      ).forEach(function (key, index) {
        publishedTag.popup[key] =
          window.VanillaTaggerEditorTemplates.popupDefaultProperties[key];
      });

      tags.push(publishedTag);
    }
  });

  return tags;
};

/*-----------------------------------------------------------------------------------------*/
