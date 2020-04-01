const WEB_HOOK_URL =
  "https://us-east-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/sentircreativo-pfjno/service/google-sheet-connection/incoming_webhook/webhook0";

function useOrder() {
  var orderRange = SpreadsheetApp.getActiveSheet().getActiveRange();
  var orderValues = orderRange.getValues()[0];
  var hasValues = orderValues.length > 1;
  if (hasValues) return fillOrderData(orderValues);
  return showErrorMessage(
    "Por favor selecciona un rango de las ultimas ordenes de compra para poder usarla."
  );
}

function fillOrderData(values) {
  const spreadsheet = SpreadsheetApp.getActive();
  let latestOrders = API.getLatestOrders();
  const order = latestOrders.find(o => o.ordenCompra === values[0]);
  if (!order) return showErrorMessage("No se pudo cargar orden");
  showMessage("Campo seleccionado", order.ordenCompra);
  const headers = spreadsheet
    .getRange("B47:B59")
    .getValues()
    .flatMap(v => v);
  let orderValues = jsonToSheetValues({
    data: order,
    headers,
    direction: "vertical"
  });
  spreadsheet.getRange("C47:C59").setValues(orderValues);
  const [cliente] = order.cliente;
  fillClientData(cliente);
}

function fillClientData(client) {
  if (!client) return showErrorMessage("No se pudo cargar orden");
  const spreadsheet = SpreadsheetApp.getActive();
  const headers = spreadsheet
    .getRange("B23:B33")
    .getValues()
    .flatMap(v => v);
  let clientValues = jsonToSheetValues({
    data: client,
    headers,
    direction: "vertical"
  });
  console.log("clientValues", clientValues);
  spreadsheet.getRange("C23:C33").setValues(clientValues);
}

function fillLatestOrders(orders) {
  const spreadsheet = SpreadsheetApp.getActive();
  const headers = spreadsheet.getRange("B7:D7").getValues()[0];
  const values = jsonToSheetValues({ data: orders, headers });
  const tableRange = spreadsheet.getRange("B8:D11");
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
  var spreadsheet = SpreadsheetApp.getActive();
  var searchRange = spreadsheet.getRange("B16:D16");
  var searchValues = searchRange.getValues()[0];
  var hasValues = !!searchValues.filter(notNull).length;
  if (hasValues) return showMessage("Buscando...", searchValues.join());
  return showErrorMessage("Por favor escribe algo para buscar");
}

function deleteOrder() {}

function editOrder() {}

function createOrder() {}

const API = {
  getOrders() {},
  searchOrder() {},
  getLatestOrders() {
    return fetchWebHook({ action: "latest" });
  },
  createOrder() {
    return fetchWebHook({ action: "create" });
  },
  updateOrder() {
    return fetchWebHook({ action: "update" });
  },
  deleteOrder() {
    return fetchWebHook({ action: "delete" });
  }
};

function fetchWebHook({ data, action }) {
  console.log("{data, action}", { data, action });
  var params = {
    method: "GET",
    followRedirects: true,
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(WEB_HOOK_URL + "?action=latest", params);
  console.log("response", JSON.stringify(response));
  if (response.getResponseCode() == 200) {
    const result = JSON.parse(response.getContentText());
    console.log("result", result);
    return result;
  }
}
