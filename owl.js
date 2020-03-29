const WEB_HOOK =
  "https://webhooks.mongodb-stitch.com/api/client/v2.0/app/ignaciostich-ojjmz/service/googlesheet-connect/incoming_webhook/webhook0";

function useOrder() {
  var orderRange = SpreadsheetApp.getActiveSheet().getActiveRange();
  var orderValues = orderRange.getValues()[0];
  var hasValues = orderValues.length > 1;
  if (hasValues) return fillOrderData(orderValues);
  return showErrorMessage(
    "Por favor selecciona un rango de las ultimas ordenes de compra para poder usarla."
  );
}

function fillOrderData(orderValues) {
  showMessage("Campo seleccionado", orderValues.join());
}

function showErrorMessage(body) {
  showMessage("Error", body);
}

function showMessage(title, body) {
  Browser.msgBox(title, body, Browser.Buttons.OK);
}

function getLastOrders() {}

function searchOrder() {
  var spreadsheet = SpreadsheetApp.getActive();
  var searchRange = spreadsheet.getRange("B16:D16");
  var searchValues = searchRange.getValues()[0];
  var hasValues = !!searchValues.filter(notNull).length;
  if (hasValues) return showMessage("Buscando...", searchValues.join());
  return showErrorMessage("Por favor escribe algo para buscar");
}

function notNull(n) {
  return !!n;
}

function deleteOrder() {}

function editOrder() {}

function createOrder() {}
