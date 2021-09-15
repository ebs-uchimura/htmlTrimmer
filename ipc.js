// define renderer
const { ipcRenderer } = require('electron');

// file chosen
window.MyOpenSend = (ping) => {       
  ipcRenderer.send("copy-html-file");
}

// delete duplicated
window.MyChangeSend = (ping) => {       
  ipcRenderer.send("change-dup-file");
}
