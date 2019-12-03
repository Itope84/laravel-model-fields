// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const pluralize = require("pluralize");

let activeEditor;
// get the text
let contents;
// find where the keyword class is
let index;

// const folderPath = vscode.workspace.workspaceFolders[0].uri
let currentFilePath, model_name;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
let relevant_migration_files;
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "extension.listFields",

    function() {
      // The code you place here will be executed every time your command is executed
      init();

      if (activeEditor.document.getText().indexOf("public $fields") != -1) {
        vscode.window.showErrorMessage(
          "Please delete previous value of $fields before running again!!"
        );
        context.subscriptions.push(disposable);
        return;
      }

      relevant_migration_files = [];

      //joining path of directory
      // const directoryPath = path.join(__dirname, '/../');
      //passsing directoryPath and callback function
      let migrations_folder = "";
      const files = fs.readdirSync(path.join(currentFilePath, "/../../"));

      // files is an array.
      // Now we need to see if migrations is in files
      if (files.indexOf("database") != -1) {
        // enter migrations
        migrations_folder = path
          .join(currentFilePath, "/../../database/migrations")
          .toString();
      }

      // we could get migrations folder in an alternative prompt here, if it's empty
      if (migrations_folder) {
        readMigrationFiles(migrations_folder, model_name);
      }

      getAllFields(migrations_folder);

      // Display a message box to the user
      vscode.window.showInformationMessage("Field added!");
    }
  );

  context.subscriptions.push(disposable);
}

function init() {
  activeEditor = vscode.window.activeTextEditor;
  contents = activeEditor.document.getText();
  index = contents.indexOf(`{`);

  currentFilePath = vscode.window.activeTextEditor.document.fileName.toString();
  model_name = currentFilePath
    .split("/")
    .pop()
    .split(".")[0];

  relevant_migration_files = [];
}

async function getAllFields(migrations_folder) {
  // now we have the files. We need to read each file and get the fields in there
  const fields = [];
  for (let i = 0; i < relevant_migration_files.length; i++) {
    const file = relevant_migration_files[i];
    const data = fs.readFileSync(
      path.join(migrations_folder, `/${file.name}`),
      "utf8"
    );

    let tableregex = /\$table\-\>\w+\((\'|\").*$/gm;

    const raw_fields = data.match(tableregex);

    raw_fields.forEach(item => {
      // split at single or double quotes
      fields.push(item.split(/"|'/)[1]);
    });
  }

  if (activeEditor) {
    let tempString = contents.substring(0, index);
    const line_no = tempString.split("\n").length;

    let final_str = `\npublic $fields = ${JSON.stringify(fields)};\n`;

    activeEditor.edit(editor => {
      // if(initial_occurence) {
      // 	const initial_line = contents.substring(0, initial_occurence).split('\n').length
      // 	const initial_pos = new vscode.Position(initial_occurence, 0)
      // 	const final_pos = initial_pos.with(initial_line, 30)
      // 	const range = new vscode.Range(initial_pos, final_pos)

      // 	editor.delete(range)
      // }
      editor.insert(new vscode.Position(line_no, 0), final_str);
    });
  }
}

function readMigrationFiles(folder, modelName, table_name) {
  // recursively read files that match modelName in folder
  // pluralise and convert modelName to camelcase
  table_name =
    table_name ||
    pluralize(modelName)
      .replace(/([A-Z])/g, function(x, y) {
        return "_" + y.toLowerCase();
      })
      .replace(/^_/, "");
  // look for files that have the table name.
  const files = fs.readdirSync(folder, { withFileTypes: true });
  // loop through, if a file and matches table_name, push to relevant array, if directory, call this function on it.
  files.forEach(file => {
    if (file.isDirectory()) {
      readMigrationFiles(
        path.join(folder, `/${file.name}`, modelName, table_name)
      );
    } else {
      if (file.name.includes(table_name)) {
        relevant_migration_files.push(file);
      }
    }
    return;
  });
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
