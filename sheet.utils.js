function camelCaseToWords(string) {
  return (string.match(/^[a-z]+|[A-Z][a-z]*/g) || [])
    .map((x) => x[0].toUpperCase() + x.substr(1).toLowerCase())
    .join(" ");
}

const normalize = (function () {
  var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç",
    to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuuÑñcc",
    mapping = {};

  for (var i = 0, j = from.length; i < j; i++)
    mapping[from.charAt(i)] = to.charAt(i);

  return function (str) {
    var ret = [];
    for (var i = 0, j = str.length; i < j; i++) {
      var c = str.charAt(i);
      if (mapping.hasOwnProperty(str.charAt(i))) ret.push(mapping[c]);
      else ret.push(c);
    }
    return ret.join("");
  };
})();

function wordToCamelCase(string) {
  return normalize(string)
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
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

function showAlert({ title, onAccepted = () => {}, onDenied = () => {} }) {
  let ui = SpreadsheetApp.getUi(); // Same variations.

  let result = ui.alert(
    title || "Por favor confirma",
    "Estás seguro que quieres continuar?",
    ui.ButtonSet.YES_NO
  );
  // Process the user's response.
  if (result == ui.Button.YES) {
    // User clicked "Yes".
    ui.alert("Acción recibida");
    onAccepted();
  } else {
    // User clicked "No" or X in the title bar.
    ui.alert("Acción cancelada");
    onDenied();
  }
}

function showMessage(title, body = "") {
  console.log(title, body);
  Browser.msgBox(title, body, Browser.Buttons.OK);
}

function sheetValuesToObject({ sheetValues, headers }) {
  let headings = headers.map((v) => wordToCamelCase(String(v)));
  console.log("headings", headings);
  let peopleWithHeadings = addHeadings(sheetValues, headings);
  function addHeadings(people, headings) {
    return people.map((personAsArray) => {
      let personAsObj = {};

      headings.forEach((heading, i) => {
        if (heading) {
          let value = personAsArray[i];
          if (isDate(value)) value = new Date(value);
          personAsObj[heading] = value;
        }
      });

      return personAsObj;
    });
  }
  return peopleWithHeadings;
}

function isDate(s) {
  if (isNaN(s) && !isNaN(Date.parse(s))) {
    return true;
  }
  return false;
}

const isToday = (date) => {
  const today = new Date();
  return (
    date.getDate() == today.getDate() &&
    date.getMonth() == today.getMonth() &&
    date.getFullYear() == today.getFullYear()
  );
};

function jsonToSheetValues({ data, headers, direction }) {
  var arrayValues = [];
  var isVertical = direction === "vertical";
  if (Array.isArray(data)) {
    arrayValues = data.map(mapObjectToArray);
  } else {
    arrayValues = mapObjectToArray(data);
  }
  function mapObjectToArray(object) {
    let array = new Array(headers.length);

    for (let key in object) {
      key = String(key);
      headers.forEach(function (header, index) {
        let normalizeKey = key === "_id" ? key : camelCaseToWords(key);
        if (normalizeKey === header) {
          let value = object[key];
          if ((object[key] || {}).$date) {
            value = new Date(+object[key].$date.$numberLong);
          }
          if ((object[key] || {}).$numberDouble) {
            value = +parseFloat(object[key].$numberDouble).toFixed(2);
          }
          array[index] = isVertical ? [value] : value;
        } else if (!array[index]) {
          array[index] = isVertical ? [""] : "";
        }
      });
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
