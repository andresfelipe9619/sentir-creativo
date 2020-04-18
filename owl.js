const ACTIVE_SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const WEB_HOOK_URL =
  "https://us-east-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/sentircreativo-pfjno/service/google-sheet-connection/incoming_webhook/webhook0";
//Funcion subscrita a los eventos del spread sheet
function onEdit(e) {
  let range = e.range;
  checkEditedCell(range);
}
//Revisamos que la hoja que se edita es "Datos"
function checkEditedCell(range) {
  const sheetName = range.getSheet().getName();
  if (sheetName !== "Datos") return;
  mapCellAction2Function(range);
}
// Funcion que mapea el clic en las celdas con checkbox
// a su funcion correspondiente
function mapCellAction2Function(range) {
  const row = +range.getRow();
  const column = +range.getColumn();
  const isChecked = !!range.getValue();
  console.log("MAPPING", { row, column, isChecked });
  const allowedCols = [5, 7];
  if (!isChecked || !allowedCols.includes(column)) return;
  let title = "";
  let action = () => console.log("No action found");
  let [rowValues] = ACTIVE_SPREADSHEET.getSheetValues(row, 1, 1, column - 1);
  let actionName = (rowValues[2] || "").toLowerCase();
  console.log("actionName", actionName);
  console.log("rowValues", rowValues);
  if (row >= 8 && row <= 11) {
    action = () => useOrder(rowValues);
  }
  if (row === 12) {
    action = getLastestOrders;
  }
  if (row === 17) {
    if (column === 5) action = searchOrder;
    if (column === 7) action = () => useOrder(rowValues);
  }
  //Click on client actions
  if (row === 48) {
    if (actionName.includes("crear")) {
      action = updateOrCreateClient;
    } else if (actionName.includes("borrar")) {
      action = deleteClient;
    }
  }
  //Click on order actions
  if (row === 66) {
    if (actionName.includes("crear")) {
      action = updateOrCreateOrder;
    } else if (actionName.includes("borrar")) {
      action = deleteOrder;
    }
  }
  //Click on finance actions
  if (row === 67) {
    if (actionName.includes("actualizar")) {
      action = updateOrderFinances;
    }
  }
  try {
    showAlert({ title, onAccepted: action });
  } catch (error) {
    console.log("OWL ERROR: ", error);
    showErrorMessage(stringify(error));
  }
}
