const ACTIVE_SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const WEB_HOOK_URL =
  "https://us-east-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/sentircreativo-pfjno/service/google-sheet-connection/incoming_webhook/webhook0";

function onEdit(e) {
  let range = e.range;
  checkEditedCell(range);
}

function checkEditedCell(range) {
  const sheetName = range.getSheet().getName();
  if (sheetName !== "Datos") return;
  mapCellAction2Function(range);
}

function mapCellAction2Function(range) {
  const row = +range.getRow();
  const column = +range.getColumn();
  const isChecked = !!range.getValue();
  console.log("MAPPING", { row, column, isChecked });
  if (!isChecked || column !== 5) return;
  let title = "";
  let action = () => console.log("No action found");
  let [rowValues] = ACTIVE_SPREADSHEET.getSheetValues(row, 1, 1, column - 1);
  console.log("rowValues", rowValues);
  if (row >= 8 && row <= 11) {
    action = () => useOrder(rowValues);
  }
  if (row === 12) {
    action = getLastestOrders;
  }
  if (row === 16) {
    action = searchOrder;
  }
  //Click on client actions
  if (row === 41) {
    action = getLastestOrders;
  }
  //Click on order actions
  if (row === 61) {
    let actionName = rowValues[2].toLowerCase();
    console.log("actionName", actionName);
    if (actionName.includes("crear")) {
      action = updateOrCreateOrder;
    } else if (actionName.includes("borrar")) {
      action = deleteOrder;
    }
  }
  //Click on global actions
  if (row === 67) {
    action = getLastestOrders;
  }
  try {
    showAlert({ title, onAccepted: action });
  } catch (error) {
    showErrorMessage(stringify(error));
  }
}

function useOrder(rowValues) {
  var hasValues = rowValues.length > 1;
  if (hasValues) {
    let latestOrders = API.getLatestOrders();
    const order = latestOrders.find((o) => o.ordenCompra === rowValues[1]);
    return fillOrderData(order);
  }
  return showErrorMessage(
    "Por favor selecciona un rango de las ultimas ordenes de compra no vacio para poder usarla."
  );
}

function fillOrderData(order) {
  if (!order) return showErrorMessage("No se pudo cargar orden");
  showMessage("Campo seleccionado", order.ordenCompra);
  const { headers, range } = getOrderRange();
  let orderValues = jsonToSheetValues({
    data: order,
    headers,
    direction: "vertical",
  });
  range.setValues(orderValues);
  const [cliente] = order.cliente;
  fillClientData(cliente);
}
function getOrderRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B47:B59")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C47:C59");
  return { headers, range };
}

function fillClientData(client) {
  if (!client) return showErrorMessage("No se pudo cargar cliente");
  const headers = ACTIVE_SPREADSHEET.getRange("B23:B33")
    .getValues()
    .flatMap((v) => v);
  let clientValues = jsonToSheetValues({
    data: client,
    headers,
    direction: "vertical",
  });
  console.log("clientValues", clientValues);
  ACTIVE_SPREADSHEET.getRange("C23:C33").setValues(clientValues);
}

function fillLatestOrders(orders) {
  const [headers] = ACTIVE_SPREADSHEET.getRange("B7:D7").getValues();
  const values = jsonToSheetValues({ data: orders, headers });
  const tableRange = ACTIVE_SPREADSHEET.getRange("B8:D11");
  const ordersValues = tableRange
    .getValues()
    .map((row, i) => ((values[i] || []).length ? values[i] : row));
  tableRange.setValues(ordersValues);
  showMessage("Ordenes cargadas exitosamente");
}

function getLastestOrders() {
  const orders = API.getLatestOrders();
  fillLatestOrders(orders);
}

function searchOrder() {
  var searchRange = ACTIVE_SPREADSHEET.getRange("B16:D16");
  var searchValues = searchRange.getValues()[0];
  var hasValues = !!searchValues.filter(notNull).length;
  if (hasValues) return showMessage("Buscando...", searchValues.join());
  return showErrorMessage("Por favor escribe algo para buscar");
}

function deleteOrder() {
  const { headers, range } = getOrderRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("order", order);
  const result = API.deleteOrder(order);
  console.log("result", stringify(result));
}

function updateOrCreateOrder() {
  const { headers, range } = getOrderRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("order", order);
  const result = API.updateOrCreateOrder(order);
  console.log("result", stringify(result));
}
