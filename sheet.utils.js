function camelCaseToWords(string) {
  return (string.match(/^[a-z]+|[A-Z][a-z]*/g) || [])
    .map(x => x[0].toUpperCase() + x.substr(1).toLowerCase())
    .join(" ");
}

function findText({ sheet, text }) {
  let index = undefined;
  let textFinder = sheet.createTextFinder(text);
  let textFound = textFinder.findNext();
  if (textFound) index = textFound.getRow();
  let data = textFound || null;
  console.log("{data, index}", { data, index });
  return { index, data };
}

function notNull(n) {
  return !!n;
}

function showErrorMessage(body) {
  showMessage("Error", body);
}

function showAlert({ onAccepted, onDenied }) {
  let ui = SpreadsheetApp.getUi(); // Same variations.

  let result = ui.alert(
    "Por favor confirma",
    "Estas segur que quieres continuar?",
    ui.ButtonSet.YES_NO
  );
  // Process the user's response.
  if (result == ui.Button.YES) {
    // User clicked "Yes".
    ui.alert("Confirmation received.");
    onAccepted();
  } else {
    // User clicked "No" or X in the title bar.
    ui.alert("Permission denied.");
    onDenied();
  }
}

function showMessage(title, body = "") {
  console.log(title, body);
  Browser.msgBox(title, body, Browser.Buttons.OK);
}

function sheetValuesToObject(sheetValues, headers) {
  let headings =
    headers[0].map(v => v.toLowerCase()) ||
    sheetValues[0].map(v => v.toLowerCase());
  let people = sheetValues;
  if (sheetValues.length > 1) people = sheetValues.slice(1);

  let peopleWithHeadings = addHeadings(people, headings);

  function addHeadings(people, headings) {
    return people.map(function(personAsArray) {
      let personAsObj = {};

      headings.forEach(function(heading, i) {
        personAsObj[heading] = personAsArray[i];
      });

      return personAsObj;
    });
  }
  return peopleWithHeadings;
}

function jsonToSheetValues({ data, headers, direction }) {
  var arrayValues = [];
  var isVertical = direction === "vertical";
  if (Array.isArray(data)) {
    arrayValues = data.map(mapObjectToArray);
  } else {
    arrayValues = mapObjectToArray(data);
  }
  console.log("headers", headers);
  function mapObjectToArray(object) {
    let array = new Array(headers.length);
    console.log("init array", array);

    let exluededKeys = ["_id"];
    for (let key in object) {
      if (!exluededKeys.includes(key)) {
        headers.forEach(function(header, index) {
          let normalizeKey = camelCaseToWords(String(key));
          if (normalizeKey === header) {
            array[index] = isVertical ? [object[key]] : object[key];
            console.log("array", array);
          } else if (!array[index]) {
            array[index] = isVertical ? [""] : "";
          }
        });
      }
    }
    return array;
  }
  return arrayValues;
}

function getRawDataFromSheet(sheetName) {
  let mSheet = ACTIVE_SPREADSHEET.getSheetByName(sheetName);
  if (mSheet)
    return mSheet.getSheetValues(
      1,
      1,
      mSheet.getLastRow(),
      mSheet.getLastColumn()
    );
}
function stringify(data) {
  return JSON.stringify(data, false, false);
}

// String.prototype.addQuery = function(obj) {
//     return this + Object.keys(obj).reduce(function(p, e, i) {
//       return p + (i == 0 ? "?" : "&") +
//         (Array.isArray(obj[e]) ? obj[e].reduce(function(str, f, j) {
//           return str + e + "=" + encodeURIComponent(f) + (j != obj[e].length - 1 ? "&" : "")
//         },"") : e + "=" + encodeURIComponent(obj[e]));
//     },"");
//   }

//   function myFunction() {
//     var url = "https://sampleUrl";
//     var query = {
//       query1: ["value1A", "value1B", "value1C"],
//       query2: "value2A, value2B",
//       query3: "value3A/value3B",
//     };
//     var endpoint = url.addQuery(query);
//     Logger.log(endpoint);
//   }
