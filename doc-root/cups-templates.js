/**
 * CUPS Template Support Scripts
 * Moved from inline templates to avoid parser issues with curly braces.
 */

function reset_config(defaultValue) {
  if (document.cups && document.cups.CUPSDCONF) {
    document.cups.CUPSDCONF.value = defaultValue;
  }
}

function update_paramtable(option) {
  var cb = document.getElementById("select-" + option);
  var paramstable = document.getElementById(option + "-params");
  if (cb && paramstable) {
    if (cb.value == "Custom") {
      paramstable.style.display = "table";
    } else {
      paramstable.style.display = "none";
    }
  }
}
