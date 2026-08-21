"use strict";

// Electron only loads a URL (local API or the live site). Production Angular
// packages must not be packed into the Windows ia32 app.
module.exports = async function beforeBuild() {
  return false;
};
