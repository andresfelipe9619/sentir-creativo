function getModules() {
    let rawModules = getRawDataFromSheet(GENERAL_DB, "MODULOS");
    Logger.log("modules");
    return rawModules;
  }
  
  function getPeriods() {
    let rawPeriods = getRawDataFromSheet(GENERAL_DB, "PERIODOS");
    let periods = sheetValuesToObject(rawPeriods);
    return periods;
  }
  
  function getStudents() {
    let rawStudents = getRawDataFromSheet(GENERAL_DB, "INSCRITOS");
    return rawStudents;
  }
  
  function getSheetFromSpreadSheet(url, sheet) {
    let Spreedsheet = SpreadsheetApp.openByUrl(url);
    if (url && sheet) return Spreedsheet.getSheetByName(sheet);
  }
  
  function getRawDataFromSheet(url, sheet) {
    let mSheet = getSheetFromSpreadSheet(url, sheet);
    if (mSheet)
      return mSheet.getSheetValues(
        1,
        1,
        mSheet.getLastRow(),
        mSheet.getLastColumn()
      );
  }
  
  function getHeadersFromSheet(sheet) {
    let headers = [];
    if (!sheet) return headers;
    headers = sheet.getSheetValues(1, 1, 1, sheet.getLastColumn())[0];
    return headers;
  }
  
  function jsonToSheetValues(json, headers) {
    let arrayValues = new Array(headers.length);
    let lowerHeaders = headers.map(normalizeString);
    for (let key in json) {
      let keyValue = normalizeString(key);
      lowerHeaders.forEach(function(header, index) {
        if (keyValue === header) {
          arrayValues[index] = String(json[key]);
        }
      });
    }
    return arrayValues;
  }
  
  function normalizeString(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }
  
  function sheetValuesToObject(sheetValues, headers) {
    let headings = headers || sheetValues[0].map(normalizeString);
    let people = null;
    if (sheetValues) people = headers ? sheetValues : sheetValues.slice(1);
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
  