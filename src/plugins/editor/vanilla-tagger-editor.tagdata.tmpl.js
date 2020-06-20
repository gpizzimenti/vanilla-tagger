window.VanillaTaggerEditorTemplates = window.VanillaTaggerEditorTemplates || {};

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.tagDefaultClasses =
  "with-border with-shadow pulsating-onhover responsive";

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.popupDefaultClasses =
  "toggle arrow-center light closeable";

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.tagForm = (tag) => `
<form class="vanilla-tagger-tagdata">
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
            }>Index numerical (0-9)</option>
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
            <option value="">None</option>
            <option value="red" ${
              tag.classes.indexOf("red") > -1 ? "red" : ""
            }>Red</option>
            <option value="green" ${
              tag.classes.indexOf("green") > -1 ? "green" : ""
            }>Green</option>
            <option value="blue" ${
              tag.classes.indexOf("blue") > -1 ? "blue" : ""
            }>Blue</option>
            <option value="xdark" ${
              tag.classes.indexOf("xdark") > -1 ? "xdark" : ""
            }>Extra-Dark</option>
            <option value="dark" ${
              tag.classes.indexOf("xdark") < 0 &&
              tag.classes.indexOf("dark") > -1
                ? "dark"
                : ""
            }>Dark</option>
            <option value="xlight" ${
              tag.classes.indexOf("xlight") > -1 ? "xlight" : ""
            }>Extra-Light</option>
            <option value="light" ${
              tag.classes.indexOf("xlight") < 0 &&
              tag.classes.indexOf("light") > -1
                ? "light"
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
      <label for="popup.classes.position">Position</label>
      <select name="popup.classes.position">
        <option value="">auto</option>
        <option value="top"  ${
          tag.popup && tag.popup.classes.replace(/-/g, "").match(/\btop\b/) > -1
            ? " selected"
            : ""
        }>top</option>
        <option value="bottom"  ${
          tag.popup &&
          tag.popup.classes.replace(/-/g, "").match(/\bbottom\b/) > -1
            ? " selected"
            : ""
        }>bottom</option>
        <option value="left"  ${
          tag.popup && tag.popup.classes.replace(/-/g, "").match(/\left\b/) > -1
            ? " selected"
            : ""
        }>left</option>
        <option value="right"  ${
          tag.popup &&
          tag.popup.classes.replace(/-/g, "").match(/\bright\b/) > -1
            ? " selected"
            : ""
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
</form>
`;

/*-----------------------------------------------------------------------------------------*/

window.VanillaTaggerEditorTemplates.buildTag = function buildTag(tag, form) {
  let formData = new FormData(form);
  for (var [key, value] of formData.entries()) {
    console.log(key, value);
  }
  return tag;
};

/*-----------------------------------------------------------------------------------------*/
