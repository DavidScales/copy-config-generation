// AppScript
// source of truth: https://script.google.com/a/macros/google.com/d/1wsn8TztnMUJqouazVgBzuRSSriT9FRujHRvf_y0gpH0nKtcdfRsOLN3b/edit?usp=sharing_eil&ts=59c538f8

// ******************************************************************************************************
// ***************************************** Instructions ***********************************************
// ******************************************************************************************************
// Set this constant to the ID of your folder
// e.g. in "https://drive.google.com/corp/drive/folders/0B1-BUeTLlQTOcHFIN0NERDRDWTg", the ID is "0B1-BUeTLlQTOcHFIN0NERDRDWTg"
var myFolderId = "0B1-BUeTLlQTOcHFIN0NERDRDWTg";
// Then Run > "main"
// Then View > Logs - this is your config
// ******************************************************************************************************

// Documentation for ILT publishing process
var documenationLink = 'https://github.com/nasearle/publishing-build-tools';

// Config generation script (link to this AppScript)
var generationScript = 'https://script.google.com/a/macros/google.com/d/1wsn8TztnMUJqouazVgBzuRSSriT9FRujHRvf_y0gpH0nKtcdfRsOLN3b/edit?usp=sharing_eil&ts=59c538f8';

// Languages to be listed in config file
var globalLangs = ['en'];

// Warning not for config file
var warning = 'WARNING: Check the config file order before publishing';

/**
 * Search a doc for the metadata table & get metadata URL
 * @param {string} docId - the ID of the doc for which you want metadata
 * @returns {string} the metadata URL
 */
function getMetaDataUrl(docId) {
  // test cases to catch
  // COMPLETE no metadata table
  // COMPLETE no URL field
  // COMPLETE empty URL field
  try {
    const doc = DocumentApp.openById(docId);
    const name = doc.getName();
    const tables = doc.getBody().getTables();
    if (tables.length == 0) {throw Error('Doc "' + name + '": Missing metadata table (no tables found in doc)');}
    const metaDataTable = tables[0];
    const numRows = metaDataTable.getNumRows();
    for (var i = 0; i < numRows; i++) {
      var row = metaDataTable.getRow(i);
      var field = row.getCell(0).getText();
      if (field === 'URL' || field === 'url' || field === 'Url') { // is Claat more strict than this? if so this should log an error for user to correct table
        var val = row.getCell(1).getText();
        if (!val) {throw Error('Doc "' + name + '": Missing URL value in metadata table');}
        return val;
      }
    }
    throw Error('Doc "' + name + '": Missing metadata table or URL field');
  } catch(err) {
    Logger.log(err);
    return 'MISSING! Check the appropriate doc';
  }
}

/**
 * Recursively searches a folder structure & populates the config object
 * @param {Folder} folder - a folder to search
 * @param {Array} ref - a reference to the parent branch of the config object
 */
function buildConfigRecursively(folder, ref) {
  const files = folder.getFiles();
  const folders = folder.getFolders();
  // If there are files...
  while (files.hasNext()) {
    var file = files.next();
    // Get the file data
    var id = file.getId();
    var name = file.getName();
    var url = getMetaDataUrl(id);
    // Populate the config object with the file data
    var leaf = {
      name: name,
      id: id,
      url: url
    };
    ref.push(leaf);
  }
  // If there are folders...
  while (folders.hasNext()) {
    var currentFolder = folders.next();
    var folderName = currentFolder.getName();
    // Add a branch to the config object & continue recursive search
    var branch = {
      name: folderName,
      contents: []
    };
    ref.push(branch);
    buildConfigRecursively(currentFolder, branch.contents);
  }
}

/**
 * Creates a JSON string representing the book configuration
 * @param {string} folderId - the ID of the book's folder
 * @returns {string} a JSON string representing the book configuration
 */
function createConfigFromFolder(folderId){
  const timestamp = new Date();
  // Get the top level book folder & book name
  const folder = DriveApp.getFolderById(folderId);
  const folderName = folder.getName();
  // Create a JSON object representing the book configuration
  const configObject = {};
  configObject.title = folderName;
  configObject.langs = globalLangs;
  configObject.generationScript = generationScript;
  configObject.documentationLink = documenationLink;
  configObject.lastGenerated = timestamp.toString();
  configObject.warning = warning;
  configObject.bookContents = [];
  // Recursively build config object
  buildConfigRecursively(folder, configObject.bookContents);
  // Once the config object is built, return it as a string
  var configString = JSON.stringify(configObject, null, 1);
  const formattedConfigString = configString.replace(/=/g, ': '); // AppScript generates JSON with "=" instead of ":" for... reasons.
  return formattedConfigString;
}

/**
 * Writes a JSON object as text to a specified doc
 * @param {Object} json - a JSON object to be written as text
 * @param {string} docId - the ID of the doc to which you want to write JSON
 */
function writeJsonToDoc(json, docId) {
  const prettyJsonString = JSON.stringify(json, null, 1);
  const doc = DocumentApp.openById(docId)
  const body = doc.getBody();
  body.setText(prettyJsonString);
}

function main() {
  const config = createConfigFromFolder(myFolderId);
  Logger.log('CONFIG below:\n\n' + config);
  // Example of optionally writing config to a Doc:
  // var configAsJson = JSON.parse(config);
  // var someDocId = '1OoZ_ASKffMAzdr3CPOqxNeaHFuwXu_3UnLqbCg3gSzE';
  // writeJsonToDoc(configAsJson, someDocId);
}
