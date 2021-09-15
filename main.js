// module
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// config
const globalRootPath = __dirname; // root folder path
const globalGranpaPath = path.resolve(globalRootPath, '../..') // change to relative path
const globalDate = Date.now().toString().slice(0, 14); // now date

let win; // main window

// when \output does not exist, make new directory
if (!fs.existsSync(`${globalGranpaPath}/output`)){
  fs.mkdirSync(`${globalGranpaPath}/output`);
}

// when app ready
app.on('ready', () => {
  createWindow();
})

// all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit(); // quit app
  }
});

// copy html file
ipcMain.on("copy-html-file", (event) => {
  openFile();
});

// delete duplicated file
ipcMain.on("change-dup-file", (event) => {
  removeDuplicated();
});

// create window
const createWindow = () => {
  // define window
  win = new BrowserWindow({ width: 800, height: 400,
    webPreferences: { 
      contextIsolation: false,
      preload: __dirname + '/ipc.js' // preload ipc.js
    } 
  });

  // load main window
  win.loadURL(`file://${__dirname}/index.html`);

  // when window closed
  win.on('closed', () => {
    win = null; // make win null
  });

}

// html copy 
const openFile = () => {
  // open file dialog
  dialog.showOpenDialog( win, {
    properties: ['openFile'],
    filters: [
      {
      name: 'Document',
        extensions: ['html']
      }
    ]
  }).then(file => {
    if(!file.canceled) {
      // read file contents
      readFile(file.filePaths[0], file);
    }
  }).catch(err => {
    console.log(err);
  });
}

// file reading
const readFile = (path) => {
  fs.readFile(path, (error, data) => {
    if (error != null) {
      console.log("readError");
      return;
    }
    // write read data to html
    writeFile(`${__dirname}/html/${globalDate}.html`, data.toString());
  });
}

// file writing
const writeFile = (path, data) => {
  fs.writeFile(path, data, (error) => {
    if (error != null) {
      console.log(error);
      return;
    } else {
      // show copy dialog
      showCopyFinishDialog();
    }
  });
}

// show copy dialog
const showCopyFinishDialog = () => {
    // option config
    const options = {
      type: 'info',
      defaultId: 1,
      title: 'copy file',
      message: 'html copied successfully',
    }
    // show complete dialog
    dialog.showMessageBox(win, options);
  }

// remove dupliacte
const removeDuplicated = async () => {
  // difine constants
  const header = `<table border="1" class="dataframe"><thead>`;
  const footer = `</tbody></table>`;

  // define array
  let trsArray = [];
  let DupArray = [];
  let noDupArray = [];

  // configuration
  const filenames = await fs.readdirSync(`${globalRootPath}/html`);

  // read file
  await fs.readFile(`${globalRootPath}/html/${filenames[0]}`, 'utf8', async(err1, data) => {
    if (err1) throw err1;
    // match strings
    let trs = await data.match(/<tr((.|\r|\n)*?)\/tr>/g);
    let urls = await data.match(/>http:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#\u3000-\u30FE\u4E00-\u9FA0\uFF01-\uFFE3]+/g);

    // extract
    await returnNoDupIndex(urls).then(async(result1) => {
      await returnNoDupHtml(trs, result1).then(async(result2) => {
        // concat extracted data
        const outdata = await header + result2.join('') + footer;
        // write concated data
        await fs.writeFile(`${globalGranpaPath}/output/${globalDate}.html`, outdata, (err2) => {
          if (err2) throw err2;
          // remove original file
          fs.unlink(`${globalRootPath}/html/${filenames[0]}`, (err3) => {
            if (err3) throw err3;
            console.log("truncate done"); 
          });
        });
        // show delete complete dialog
        await showChangeFinishDialog();
      });
    });
  });

  // no duplicate index
  const returnNoDupIndex = async(arr) => {
    await arr.filter(async(val, i, self) => {
      if( self.indexOf(val) === i ) {
        await noDupArray.push(i);
      } else {
        await DupArray.push(i);
      }
    });
    // no duplicate index
    return noDupArray;
  } 

  // no duplicate array
  const returnNoDupHtml = async(arr, nodupIndex) => {
    await arr.filter( ( value, index, array ) => {
      if( nodupIndex.includes( index ) ) {
        trsArray.push(value.replace("\r\n", ""));
      }
    })
    //  no duplicate array
    return trsArray;
  }

  // file geneartion success
  const showChangeFinishDialog = () => {
    // config option
    const options = {
      type: 'info',
      defaultId: 1,
      title: 'completed',
      message: 'created no duplicate html files. check output directory.',
    }
    // show dialog
    dialog.showMessageBox(win, options);
  }
};